import { Project, SyntaxKind, StringLiteral, NoSubstitutionTemplateLiteral } from 'ts-morph';

const project = new Project();
project.addSourceFilesAtPaths('src/**/*.tsx');
project.addSourceFilesAtPaths('src/**/*.ts');

const untranslated = new Set<string>();

const ignorePatterns = [
    /^[a-z_]+$/, // keys
    /^\//, // paths
    /^[A-Z_]+$/, // ENUM_LIKE
    /^@\//, // alias imports
    /\.(png|jpg|jpeg|gif|svg)$/, // images
    /^rgba?\(|#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, // colors
    /^font-family|solid|bold|italic|normal|center|right|left|row|column|flex/, // styles
    /^http/, // urls
    /^c\./, // colors object
    /^[A-Za-z0-9-]+$/, // single words (often ids or keys), we'll miss single word translations but avoid 99% noise
];

project.getSourceFiles().forEach(sourceFile => {
    // Skip i18n config and locales
    if (sourceFile.getFilePath().includes('locales') || sourceFile.getFilePath().includes('i18n.ts')) return;

    sourceFile.forEachDescendant(node => {
        if (node.isKind(SyntaxKind.StringLiteral) || node.isKind(SyntaxKind.NoSubstitutionTemplateLiteral)) {
            const text = node.getLiteralText();
            if (text.trim().length === 0) return;
            if (ignorePatterns.some(p => p.test(text))) return;
            
            // If it has spaces or capital letters and isn't a key, it might be English text
            if (/[A-Z]/.test(text) || /\s/.test(text)) {
                // Ignore if it's inside a t('...') call
                const parent = node.getParent();
                if (parent && parent.isKind(SyntaxKind.CallExpression)) {
                    const expression = parent.getExpression();
                    if (expression.getText() === 't' || expression.getText() === 'i18n.t') return;
                }
                
                // Ignore if it's an import declaration
                if (node.getFirstAncestorByKind(SyntaxKind.ImportDeclaration)) return;

                console.log(`${sourceFile.getBaseName()}:${node.getStartLineNumber()} -> "${text}"`);
                untranslated.add(text);
            }
        }
    });
});
