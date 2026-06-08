// declarations.d.ts

// React
declare module 'react' {
  export function useState<T>(initialState: T | (() => T)): [T, (newState: T | ((prevState: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: ReadonlyArray<any>): void;
  export function useRef<T>(initialValue: T): { current: T };
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: ReadonlyArray<any>): T;
  export function useMemo<T>(factory: () => T, deps: ReadonlyArray<any> | undefined): T;
  export function useContext<T>(context: any): T;
  export function createContext<T>(defaultValue: T): any;

  const React: any;
  export default React;
}

// React Native
declare module 'react-native' {
  export const View: any;
  export const Text: any;
  export const TextInput: any;
  export const FlatList: any;
  export const TouchableOpacity: any;
  export const ActivityIndicator: any;
  export const SafeAreaView: any;
  export const Modal: any;
  export const StyleSheet: any;
  export const Alert: any;
  export const ScrollView: any;
  export const Image: any;
  export const KeyboardAvoidingView: any;
  export const Platform: any;
  export type ViewStyle = any;
  export type TextStyle = any;
  export type ImageStyle = any;
}

// React Native WebView
declare module 'react-native-webview' {
  const WebView: any;
  export { WebView };
}