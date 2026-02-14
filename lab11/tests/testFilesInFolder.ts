import { desiredMark } from '../../desiredMark.json';
import { DesiredMark } from '../../mark';
import { 
    readFileSync, 
    readdirSync 
} from 'fs';
import { join as pathJoin, parse as pathParse } from 'path';
import { test, expect } from '@jest/globals';

export const sampleDir = "./lab11/samples_lab11";  // Изменил на lab11/samples_lab11

export const testRe = /^(?<mark>[^\.]+)\.(?<name>.*?)($|(?<error>\.Error\.(?<startLine>\d+)?(\.(?<startCol>\d+)((-(?<endLine>\d+)\.)?(?<endCol>\d+))?)?))/;

export function addIntGroup(e: any, groups: {[key: string]: string;}, groupName: string) {
    if (groups[groupName])
        e[groupName] = parseInt(groups[groupName]);
}

export function testFilesInFolderAsync(folder: string, parseFunc: (name: string, source: string) => Promise<any>) {
    let files = readdirSync(folder, { withFileTypes: true, recursive: true });
    for (const file of files) {
        const filePathString = pathJoin(file.parentPath, file.name);
        const filePath = pathParse(filePathString);

        if (!file.isDirectory() && filePath.ext == ".funny") {
            const name = filePath.name.replaceAll(".", " ");
            const sample = readFileSync(filePathString, 'utf-8');
            const m = filePath.base.match(testRe);
            
            if (m && m.groups) {
                if (m.groups.mark as DesiredMark > desiredMark) {
                    test.skip(name, () => { });
                } 
                else if (m.groups.error) {
                    var e = {};
                    addIntGroup(e, m.groups, 'startLine');
                    addIntGroup(e, m.groups, 'startCol');
                    addIntGroup(e, m.groups, 'endLine');
                    addIntGroup(e, m.groups, 'endCol');

                    test(name, async () => {
                        await expect(parseFunc(filePath.name, sample)).rejects.toThrow(
                            expect.objectContaining(e)
                        );
                    });
                } 
                else { // no error specified in the file name
                    test(name, async () => {
                        await expect(parseFunc(filePath.name, sample)).resolves.not.toThrow();
                    });
                }
            }
        }
    }
}