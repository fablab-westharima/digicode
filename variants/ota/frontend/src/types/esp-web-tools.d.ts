// esp-web-tools の型定義
declare module 'esp-web-tools' {
  // モジュールをインポートするとカスタム要素が登録される
}

declare namespace JSX {
  interface IntrinsicElements {
    'esp-web-install-button': React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        manifest?: string;
      },
      HTMLElement
    >;
  }
}
