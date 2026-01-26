export class DEFINITION {
  // Main project config file
  static configFile = '/Game/config.json';

  // Settings file path
  static settingsFile = '/Game/plfg_settings.json';
  static componentTemplateFile = '/components.cti';

  // Ignore patterns for eager scripts (plugins/systems)
  static ignoreEager: string[] = [
    '@/Game/**/*.system.ts',
    '@/Game/**/*.system.js',
    '@/Game/**/*.plugin.ts',
    '@/Game/**/*.plugin.js'
  ];
  
  // Base scripts folder
  static scriptsFolder = '@/Game/';
  static eagerModules = '@/**/*.{plugin,system}.{ts,js}';
  static lazyScripts = '@/Game/**/*.{ts,js}';



  // Example: default resources folder
  static resourcesFolder = '/Game/files/';
  
  static primaryScene = "/Game/files/Scenes/Primary.json";
}
