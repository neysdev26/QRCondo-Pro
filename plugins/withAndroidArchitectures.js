/**
 * Config plugin: exclui a ABI x86 de reactNativeArchitectures no
 * android/gradle.properties gerado pelo prebuild.
 *
 * Motivo: incompatibilidade entre NDK 27 + Windows + ABI x86 causando
 * erros de linking no CMake com react-native-reanimated. Ver histórico
 * do projeto QrCondo Pro.
 *
 * Antes desta correção, isso era feito editando manualmente
 * android/gradle.properties depois de cada `expo prebuild`. Com este
 * plugin, o prebuild já gera o arquivo correto automaticamente.
 */
const { withGradleProperties } = require('@expo/config-plugins');

// Ajuste esta lista se precisar reincluir alguma ABI no futuro
// (ex: ao testar em um emulador x86 novamente).
const ARCHITECTURES = ['armeabi-v7a', 'arm64-v8a', 'x86_64'];

module.exports = function withAndroidArchitectures(config) {
  return withGradleProperties(config, (config) => {
    const key = 'reactNativeArchitectures';
    const value = ARCHITECTURES.join(',');

    const existing = config.modResults.find(
      (item) => item.type === 'property' && item.key === key
    );

    if (existing) {
      existing.value = value;
    } else {
      config.modResults.push({
        type: 'property',
        key,
        value,
      });
    }

    return config;
  });
};
