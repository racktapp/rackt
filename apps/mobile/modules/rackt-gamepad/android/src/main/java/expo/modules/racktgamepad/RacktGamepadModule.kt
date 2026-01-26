package expo.modules.racktgamepad

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class RacktGamepadModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("RacktGamepad")

    Events("onConnect", "onDisconnect", "onButton", "onAxis")

    Function("getConnectedControllers") {
      emptyList<Map<String, String>>()
    }

    Function("startDiscovery") {}
    Function("stopDiscovery") {}
  }
}
