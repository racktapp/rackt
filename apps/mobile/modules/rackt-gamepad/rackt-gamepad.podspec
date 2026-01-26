require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name = package['name']
  s.version = package['version']
  s.summary = package['description']
  s.description = package['description']
  s.author = package['author'] || 'Rackt'
  s.homepage = package['homepage'] || 'https://example.com'
  s.license = package['license'] || 'MIT'
  s.platforms = { :ios => '13.0' }
  s.source = { :path => '.' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = 'ios/**/*.{h,m,mm,swift}'
end
