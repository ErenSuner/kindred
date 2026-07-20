import { Project, SyntaxKind, Node, FunctionDeclaration, ArrowFunction, VariableDeclaration } from 'ts-morph';
import * as fs from 'fs';
import * as path from 'path';

const project = new Project();
project.addSourceFilesAtPaths("src/app/**/*.tsx");
project.addSourceFilesAtPaths("src/components/**/*.tsx");

const dictionary: Record<string, string> = {};

function generateKey(text: string): string {
    const clean = text.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const parts = clean.split('_').slice(0, 5);
    let baseKey = parts.join('_') || 'text';
    if (baseKey.length > 30) baseKey = baseKey.substring(0, 30);
    
    let key = baseKey;
    let i = 1;
    while (dictionary[key] && dictionary[key] !== text.trim()) {
        key = `${baseKey}_${i}`;
        i++;
    }
    dictionary[key] = text.trim();
    return key;
}

const targetAttributes = ['label', 'placeholder', 'title', 'subtitle'];

for (const sourceFile of project.getSourceFiles()) {
    // We already manually translated index, login, register. So we skip them.
    if (sourceFile.getFilePath().includes('index.tsx') && sourceFile.getFilePath().includes('app/index.tsx')) continue;
    if (sourceFile.getFilePath().includes('login.tsx')) continue;
    if (sourceFile.getFilePath().includes('register.tsx')) continue;
    if (sourceFile.getFilePath().includes('_layout.tsx')) continue;

    let modified = false;
    let componentsToUpdate = new Set<Node>();

    // 1. Find all JSX Text
    const jsxTexts = sourceFile.getDescendantsOfKind(SyntaxKind.JsxText);
    for (const jsxText of jsxTexts) {
        const text = jsxText.getLiteralText();
        if (text.trim().length > 1 && /[a-zA-Z]/.test(text)) {
            const key = generateKey(text);
            // Find parent component
            const parentComp = jsxText.getFirstAncestor(node => 
                node.getKind() === SyntaxKind.FunctionDeclaration || 
                node.getKind() === SyntaxKind.ArrowFunction
            );
            if (parentComp) componentsToUpdate.add(parentComp);

            jsxText.replaceWithText(`{t('${key}')}`);
            modified = true;
        }
    }

    // 2. Find specific JSX Attributes (label, placeholder, title)
    const jsxAttributes = sourceFile.getDescendantsOfKind(SyntaxKind.JsxAttribute);
    for (const attr of jsxAttributes) {
        const name = attr.getNameNode().getText();
        if (targetAttributes.includes(name)) {
            const init = attr.getInitializer();
            if (init && Node.isStringLiteral(init)) {
                const text = init.getLiteralText();
                if (text.trim().length > 0 && /[a-zA-Z]/.test(text)) {
                    const key = generateKey(text);
                    // Find parent component
                    const parentComp = attr.getFirstAncestor(node => 
                        node.getKind() === SyntaxKind.FunctionDeclaration || 
                        node.getKind() === SyntaxKind.ArrowFunction
                    );
                    if (parentComp) componentsToUpdate.add(parentComp);

                    attr.setInitializer(`{t('${key}')}`);
                    modified = true;
                }
            }
        }
    }

    if (modified) {
        // Import useTranslation
        const importDecl = sourceFile.getImportDeclaration(decl => decl.getModuleSpecifierValue() === 'react-i18next');
        if (!importDecl) {
            sourceFile.addImportDeclaration({
                namedImports: ['useTranslation'],
                moduleSpecifier: 'react-i18next'
            });
        }

        // Add const { t } = useTranslation(); to each component
        for (const comp of componentsToUpdate) {
            let body: Node | undefined;
            if (Node.isFunctionDeclaration(comp)) {
                body = comp.getBody();
            } else if (Node.isArrowFunction(comp)) {
                body = comp.getBody();
                if (body && !Node.isBlock(body)) {
                    // It's an implicit return arrow function, skip for now to avoid breaking or wrap in block
                    // For simplicity in this script, we might just skip implicit returns as they rarely have hooks
                    continue; 
                }
            }

            if (body && Node.isBlock(body)) {
                const statements = body.getStatements();
                const hasTranslation = statements.some(s => s.getText().includes('useTranslation()'));
                if (!hasTranslation) {
                    body.insertStatements(0, 'const { t } = useTranslation();');
                }
            }
        }
        sourceFile.saveSync();
    }
}

fs.writeFileSync(path.join(__dirname, '..', 'src', 'locales', 'extracted.json'), JSON.stringify(dictionary, null, 2));
console.log('Extraction complete.');
