// pdfmake ships no TypeScript types (and @types/pdfmake stops at 0.3.3, well
// behind the 0.3.11 actually installed) — a minimal shim for just the
// surface exportDiaryPdf.ts uses, rather than pulling in a mismatched or
// overly broad third-party type package.

declare module "pdfmake/build/pdfmake" {
	interface PdfMakeDocument {
		download(filename?: string): Promise<void>;
	}

	interface PdfMakeStatic {
		createPdf(docDefinition: Record<string, unknown>): PdfMakeDocument;
		addVirtualFileSystem(vfs: Record<string, string>): void;
	}

	const pdfMake: PdfMakeStatic;
	export default pdfMake;
}

declare module "pdfmake/build/vfs_fonts" {
	const vfs: Record<string, string>;
	export default vfs;
}
