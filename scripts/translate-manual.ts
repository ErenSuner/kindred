import { Project, SyntaxKind } from 'ts-morph';
import fs from 'fs';

const project = new Project();
project.addSourceFilesAtPaths('src/**/*.tsx');
project.addSourceFilesAtPaths('src/**/*.ts');

const translations = {
    // [personId].tsx
    "Pick a day and a month.": "Bir gün ve ay seçin.",
    "We'll remind you on the day": "O gün size hatırlatacağız",
    "Gift ideas, plans, anything you want to remember for this birthday.": "Hediye fikirleri, planlar, bu doğum günü için hatırlamak istediğiniz her şey.",
    "Saving…": "Kaydediliyor…",
    "Save changes": "Değişiklikleri kaydet",

    // [id].tsx & [dayId].tsx
    "Give your event a title.": "Etkinliğinize bir başlık verin.",
    "A one-time event needs a year.": "Tek seferlik bir etkinlik yıl gerektirir.",
    "Reminders updated": "Hatırlatıcılar güncellendi",
    "Date · year required": "Tarih · yıl zorunlu",
    "Give this day a title.": "Bu güne bir başlık verin.",
    "Special day": "Özel gün",

    // routine.tsx
    "Class": "Ders",
    "Gym": "Spor Salonu",
    "Therapy": "Terapi",
    "Football": "Futbol",
    "Language course": "Dil kursu",

    // settings.tsx
    "Match phone": "Telefonla eşleştir",
    "Light": "Açık",
    "Dark": "Koyu",
    "Soft reminders for important moments": "Önemli anlar için hafif hatırlatmalar",
    "Mother's Day, Valentine's Day and more": "Anneler Günü, Sevgililer Günü ve daha fazlası",
    "When nudges arrive each day": "Hatırlatmaların her gün geleceği zaman",
    "Lamplight in light or dark": "Açık veya koyu mod",
    "Delete account": "Hesabı sil",
    "Final warning": "Son uyarı",
    "Are you absolutely sure? This will permanently delete your account, your people, and all saved memories. This action cannot be undone.": "Emin misiniz? Bu işlem hesabınızı, kişilerinizi ve tüm kayıtlı anılarınızı kalıcı olarak silecektir. Bu işlem geri alınamaz.",
    "This is your last chance. All your data will be permanently erased. Are you sure you want to proceed?": "Bu son şansınız. Tüm verileriniz kalıcı olarak silinecektir. Devam etmek istediğinize emin misiniz?",
    "Delete everything": "Her şeyi sil",
    "Yes, delete my account": "Evet, hesabımı sil"
};

const enDictPath = 'src/locales/en.json';
const trDictPath = 'src/locales/tr.json';

const enDict = JSON.parse(fs.readFileSync(enDictPath, 'utf8'));
const trDict = JSON.parse(fs.readFileSync(trDictPath, 'utf8'));

// Generate keys for the new translations
const generateKey = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').substring(0, 30);

const keyMap: Record<string, string> = {};
for (const [enText, trText] of Object.entries(translations)) {
    const key = generateKey(enText);
    enDict[key] = enText;
    trDict[key] = trText;
    keyMap[enText] = key;
}

fs.writeFileSync(enDictPath, JSON.stringify(enDict, null, 2));
fs.writeFileSync(trDictPath, JSON.stringify(trDict, null, 2));

console.log("Updated en.json and tr.json");

// Now replace in files
project.getSourceFiles().forEach(sourceFile => {
    let modified = false;

    // Check StringLiterals and NoSubstitutionTemplateLiterals
    sourceFile.forEachDescendant(node => {
        if (node.isKind(SyntaxKind.StringLiteral) || node.isKind(SyntaxKind.NoSubstitutionTemplateLiteral)) {
            const text = node.getLiteralText();
            if (keyMap[text]) {
                const key = keyMap[text];
                // if it's already inside t(), skip
                const parent = node.getParent();
                if (parent && parent.isKind(SyntaxKind.CallExpression) && ['t', 'i18n.t'].includes(parent.getExpression().getText())) {
                    return;
                }

                // If it's a JSX attribute, it needs to be `{t('key')}`
                if (parent && parent.isKind(SyntaxKind.JsxAttribute)) {
                    // But maybe it's not directly inside JsxAttribute... wait
                }

                // Check if file has t or useTranslation imported
                const hasTranslation = sourceFile.getImportDeclarations().some(imp => imp.getModuleSpecifierValue() === 'react-i18next');
                
                // For simplicity, we just use i18n.t
                let importDecl = sourceFile.getImportDeclarations().find(imp => imp.getModuleSpecifierValue() === '@/lib/i18n');
                if (!importDecl) {
                    sourceFile.addImportDeclaration({
                        defaultImport: 'i18n',
                        moduleSpecifier: '@/lib/i18n'
                    });
                }

                if (parent && parent.isKind(SyntaxKind.JsxAttribute)) {
                    node.replaceWithText(`{i18n.t('${key}')}`);
                } else if (parent && parent.isKind(SyntaxKind.JsxExpression)) {
                     // Inside { ... }
                    node.replaceWithText(`i18n.t('${key}')`);
                } else if (parent && parent.isKind(SyntaxKind.ArrayLiteralExpression)) {
                    node.replaceWithText(`i18n.t('${key}')`);
                } else if (parent && parent.isKind(SyntaxKind.PropertyAssignment)) {
                    node.replaceWithText(`i18n.t('${key}')`);
                } else if (parent && parent.isKind(SyntaxKind.CallExpression)) {
                    node.replaceWithText(`i18n.t('${key}')`);
                } else if (parent && parent.isKind(SyntaxKind.ConditionalExpression)) {
                    node.replaceWithText(`i18n.t('${key}')`);
                } else if (parent && parent.isKind(SyntaxKind.BinaryExpression)) {
                    node.replaceWithText(`i18n.t('${key}')`);
                } else {
                    node.replaceWithText(`i18n.t('${key}')`);
                }
                modified = true;
            }
        }
    });

    // Also look for JsxText (e.g. settings.tsx where we might have missed something, or simple JSX text)
    sourceFile.forEachDescendant(node => {
        if (node.isKind(SyntaxKind.JsxText)) {
            const text = node.getLiteralText().trim();
            if (keyMap[text]) {
                const key = keyMap[text];
                
                let importDecl = sourceFile.getImportDeclarations().find(imp => imp.getModuleSpecifierValue() === '@/lib/i18n');
                if (!importDecl) {
                    sourceFile.addImportDeclaration({
                        defaultImport: 'i18n',
                        moduleSpecifier: '@/lib/i18n'
                    });
                }

                node.replaceWithText(`{i18n.t('${key}')}`);
                modified = true;
            }
        }
    });

    if (modified) {
        sourceFile.saveSync();
        console.log(`Updated ${sourceFile.getBaseName()}`);
    }
});
