declare module 'html-to-docx' {
  function HTMLtoDOCX(
    htmlString: string,
    headerHTMLString: string | null,
    options?: Record<string, any>
  ): Promise<Buffer>;
  export default HTMLtoDOCX;
}
