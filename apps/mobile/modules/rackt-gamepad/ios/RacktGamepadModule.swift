import ExpoModulesCore
import GameController

public class RacktGamepadModule: Module {
  private var isObserving = false
  private var discoveryStarted = false
  private var connectedControllers: [ObjectIdentifier: GCController] = [:]
  private var notificationObservers: [NSObjectProtocol] = []

  public func definition() -> ModuleDefinition {
    Name("RacktGamepad")

    Constants([
      "available": true
    ])

    Events("onConnect", "onDisconnect", "onButton", "onAxis")

    OnStartObserving {
      self.isObserving = true
      self.addObservers()
      self.startDiscoveryInternal()
      self.refreshConnectedControllers(emitConnectEvents: true)
    }

    OnStopObserving {
      self.isObserving = false
      self.stopDiscoveryInternal()
      self.removeObservers()
    }

    Function("getConnectedControllers") { () -> [[String: String]] in
      return self.connectedControllerPayloads()
    }

    Function("startDiscovery") {
      self.startDiscoveryInternal()
      self.refreshConnectedControllers(emitConnectEvents: false)
    }

    Function("stopDiscovery") {
      self.stopDiscoveryInternal()
    }
  }

  private func startDiscoveryInternal() {
    guard !discoveryStarted else { return }
    discoveryStarted = true
    GCController.startWirelessControllerDiscovery(completionHandler: nil)
  }

  private func stopDiscoveryInternal() {
    guard discoveryStarted else { return }
    discoveryStarted = false
    GCController.stopWirelessControllerDiscovery()
  }

  private func addObservers() {
    guard notificationObservers.isEmpty else { return }
    let center = NotificationCenter.default
    notificationObservers.append(
      center.addObserver(
        forName: .GCControllerDidConnect,
        object: nil,
        queue: .main
      ) { [weak self] notification in
        guard let controller = notification.object as? GCController else { return }
        self?.handleControllerConnected(controller)
      }
    )
    notificationObservers.append(
      center.addObserver(
        forName: .GCControllerDidDisconnect,
        object: nil,
        queue: .main
      ) { [weak self] notification in
        guard let controller = notification.object as? GCController else { return }
        self?.handleControllerDisconnected(controller)
      }
    )
  }

  private func removeObservers() {
    let center = NotificationCenter.default
    notificationObservers.forEach { center.removeObserver($0) }
    notificationObservers.removeAll()
  }

  private func refreshConnectedControllers(emitConnectEvents: Bool) {
    let controllers = GCController.controllers()
    let controllerIds = Set(controllers.map { ObjectIdentifier($0) })

    controllers.forEach { controller in
      let identifier = ObjectIdentifier(controller)
      if connectedControllers[identifier] == nil {
        connectedControllers[identifier] = controller
        configureController(controller)
        if emitConnectEvents {
          emitConnectEvent(for: controller)
        }
      }
    }

    let disconnectedIds = connectedControllers.keys.filter { !controllerIds.contains($0) }
    disconnectedIds.forEach { id in
      connectedControllers.removeValue(forKey: id)
    }
  }

  private func handleControllerConnected(_ controller: GCController) {
    let identifier = ObjectIdentifier(controller)
    guard connectedControllers[identifier] == nil else { return }
    connectedControllers[identifier] = controller
    configureController(controller)
    emitConnectEvent(for: controller)
  }

  private func handleControllerDisconnected(_ controller: GCController) {
    let identifier = ObjectIdentifier(controller)
    connectedControllers.removeValue(forKey: identifier)
    emitDisconnectEvent(for: controller)
  }

  private func configureController(_ controller: GCController) {
    guard let gamepad = controller.extendedGamepad else { return }
    gamepad.valueChangedHandler = { [weak self] gamepad, element in
      self?.handleGamepadInput(gamepad: gamepad, element: element, controller: controller)
    }
  }

  private func handleGamepadInput(
    gamepad: GCControllerExtendedGamepad,
    element: GCControllerElement,
    controller: GCController
  ) {
    if let button = element as? GCControllerButtonInput,
       let name = buttonName(for: gamepad, button: button) {
      emitButtonEvent(name: name, button: button, controller: controller)
      return
    }

    if let directionPad = element as? GCControllerDirectionPad,
       let name = axisName(for: gamepad, pad: directionPad) {
      emitAxisEvent(name: name, pad: directionPad, controller: controller)
    }
  }

  private func emitConnectEvent(for controller: GCController) {
    guard isObserving else { return }
    sendEvent("onConnect", controllerPayload(controller))
  }

  private func emitDisconnectEvent(for controller: GCController) {
    guard isObserving else { return }
    sendEvent("onDisconnect", controllerPayload(controller))
  }

  private func emitButtonEvent(name: String, button: GCControllerButtonInput, controller: GCController) {
    guard isObserving else { return }
    sendEvent(
      "onButton",
      [
        "name": name,
        "pressed": button.isPressed,
        "value": button.value,
        "vendorName": controller.vendorName ?? "Unknown",
        "productCategory": controller.productCategory
      ]
    )
  }

  private func emitAxisEvent(name: String, pad: GCControllerDirectionPad, controller: GCController) {
    guard isObserving else { return }
    sendEvent(
      "onAxis",
      [
        "name": name,
        "x": pad.xAxis.value,
        "y": pad.yAxis.value,
        "vendorName": controller.vendorName ?? "Unknown",
        "productCategory": controller.productCategory
      ]
    )
  }

  private func controllerPayload(_ controller: GCController) -> [String: String] {
    return [
      "vendorName": controller.vendorName ?? "Unknown",
      "productCategory": controller.productCategory
    ]
  }

  private func connectedControllerPayloads() -> [[String: String]] {
    return connectedControllers.values.map { controllerPayload($0) }
  }

  private func buttonName(
    for gamepad: GCControllerExtendedGamepad,
    button: GCControllerButtonInput
  ) -> String? {
    if button === gamepad.buttonA { return "a" }
    if button === gamepad.buttonB { return "b" }
    if button === gamepad.buttonX { return "x" }
    if button === gamepad.buttonY { return "y" }
    if button === gamepad.leftShoulder { return "leftShoulder" }
    if button === gamepad.rightShoulder { return "rightShoulder" }
    if button === gamepad.leftTrigger { return "leftTrigger" }
    if button === gamepad.rightTrigger { return "rightTrigger" }
    if button === gamepad.buttonMenu { return "menu" }
    if let options = gamepad.buttonOptions, button === options { return "options" }
    if let home = gamepad.buttonHome, button === home { return "home" }
    return nil
  }

  private func axisName(for gamepad: GCControllerExtendedGamepad, pad: GCControllerDirectionPad) -> String? {
    if pad === gamepad.leftThumbstick { return "leftThumbstick" }
    if pad === gamepad.rightThumbstick { return "rightThumbstick" }
    if pad === gamepad.dpad { return "dpad" }
    return nil
  }
}
