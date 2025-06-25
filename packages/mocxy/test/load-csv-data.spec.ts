import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import {loadCsvDataAsMap} from '../src/load-csv-data';
import fs from 'node:fs';
import path from 'node:path';

const tmpDir = path.join(__dirname, 'temp-data');

beforeEach(() => {
    fs.mkdirSync(tmpDir, {recursive: true});
});

afterEach(() => {
    fs.rmSync(tmpDir, {recursive: true, force: true});
});

function writeCsv(relativePath: string, content: string) {
    const fullPath = path.join(tmpDir, 'data', relativePath);
    fs.mkdirSync(path.dirname(fullPath), {recursive: true});
    fs.writeFileSync(fullPath, content.trim());
}

describe('load-csv-data', () => {
    it('loads simple csv file into json array', () => {
        writeCsv('users.csv', `
      id,name,age
      1,Alice,30
      2,Bob,25
    `);

        const result = loadCsvDataAsMap(tmpDir);
        expect(result).toHaveProperty('users');
        expect(result.users).toEqual([
            {id: 1, name: 'Alice', age: 30},
            {id: 2, name: 'Bob', age: 25}
        ]);
    });

    it('ignores non-csv files', () => {
        const txtPath = path.join(tmpDir, 'data', 'note.txt');
        fs.mkdirSync(path.dirname(txtPath), {recursive: true});
        fs.writeFileSync(txtPath, 'this is not csv');

        const result = loadCsvDataAsMap(tmpDir);
        expect(result).toEqual({});
    });

    it('includes subfolder files with relative key', () => {
        writeCsv('sub/products.csv', `
      id,name
      1,Phone
      2,Laptop
    `);

        const result = loadCsvDataAsMap(tmpDir);
        expect(result).toHaveProperty('sub/products');
        expect(result['sub/products'][0]).toEqual({id: 1, name: 'Phone'});
    });

    it('omits unquoted empty values as properties', () => {
        writeCsv('blank.csv', `
  id,name,email
  1,Alice,
  2,Bob,
`);


        const result = loadCsvDataAsMap(tmpDir);
        expect(result.blank[0]).not.toHaveProperty('email');
    });

    it('keeps quoted empty strings as properties', () => {
        writeCsv('quoted-empty.csv', `
      id,name,email
      1,"Alice",""
    `);

        const result = loadCsvDataAsMap(tmpDir);
        expect(result['quoted-empty'][0]).toHaveProperty('email', '');
    });

    it('casts strings to numbers, booleans and nulls when unquoted', () => {
        writeCsv('types.csv', `
      id,active,score
      1,true,42
      2,false,3.14
      3,null,null
    `);

        const result = loadCsvDataAsMap(tmpDir);
        expect(result.types).toEqual([
            {id: 1, active: true, score: 42},
            {id: 2, active: false, score: 3.14},
            {id: 3, active: null, score: null}
        ]);
    });

    it('handles malformed csv gracefully', () => {
        writeCsv('broken.csv', `
      id,name
      1,"Alice
    `);

        const spy = vi.spyOn(console, 'error').mockImplementation(() => {
        });
        const result = loadCsvDataAsMap(tmpDir);
        expect(result).not.toHaveProperty('broken');
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });
    it('parses quoted JSON object correctly', () => {
        writeCsv('json-object.csv', `
    id,name,meta
    1,Alice,"{""role"": ""admin"", ""active"": true}"
  `);

        const result = loadCsvDataAsMap(tmpDir);

        expect(result).toHaveProperty('json-object');
        expect(result['json-object']).toEqual([
            {
                id: 1,
                name: 'Alice',
                meta: { role: 'admin', active: true }
            }
        ]);
    });
    it('parses quoted JSON array correctly', () => {
        writeCsv('json-array.csv', `
    id,name,values
    2,Bob,"[1, 2, 3]"
  `);

        const result = loadCsvDataAsMap(tmpDir);

        expect(result).toHaveProperty('json-array');
        expect(result['json-array']).toEqual([
            {
                id: 2,
                name: 'Bob',
                values: [1, 2, 3]
            }
        ]);
    });
    it('leaves non-JSON quoted string intact', () => {
        writeCsv('quoted-string.csv', `
    id,name,notes
    3,Carol,"hello world"
  `);

        const result = loadCsvDataAsMap(tmpDir);

        expect(result).toHaveProperty('quoted-string');
        expect(result['quoted-string']).toEqual([
            {
                id: 3,
                name: 'Carol',
                notes: 'hello world'
            }
        ]);
    });
    it('fails to parse invalid JSON but keeps string', () => {
        writeCsv('invalid-json.csv', `
    id,name,meta
    4,Dan,"{invalid json}"
  `);

        const result = loadCsvDataAsMap(tmpDir);

        expect(result).toHaveProperty('invalid-json');
        expect(result['invalid-json']).toEqual([
            {
                id: 4,
                name: 'Dan',
                meta: '{invalid json}' // behouden als string
            }
        ]);
    });
    it('does not parse unquoted JSON-looking value as JSON', () => {
        writeCsv('unquoted-json.csv', `
    id,name,meta
    5,Eve,{not_json}
  `);

        const result = loadCsvDataAsMap(tmpDir);

        expect(result).toHaveProperty('unquoted-json');
        expect(result['unquoted-json']).toEqual([
            {
                id: 5,
                name: 'Eve',
                meta: '{not_json}'
            }
        ]);
    });
    it('skips malformed CSV row due to unquoted JSON with commas', () => {
        writeCsv('malformed-row.csv', `
    id,name,meta
    5,Eve,{ "foo": "bar" }
  `);

        const result = loadCsvDataAsMap(tmpDir);

        expect(result).not.toHaveProperty('malformed-row');
    });
    it('parses dotted keys into nested objects', () => {
        writeCsv('nested-fields.csv', `
    foo.id,bar,foo.name
    1,2,3
  `);

        const result = loadCsvDataAsMap(tmpDir);

        expect(result).toHaveProperty('nested-fields');
        expect(result['nested-fields']).toEqual([
            {
                foo: {
                    id: 1,
                    name: 3
                },
                bar: 2
            }
        ]);
    });
    it('parses keys with multiple nesting levels correctly', () => {
        writeCsv('deep-nesting.csv', `
    user.profile.name,user.profile.age
    Alice,30
  `);

        const result = loadCsvDataAsMap(tmpDir);

        expect(result).toHaveProperty('deep-nesting');
        expect(result['deep-nesting']).toEqual([
            {
                user: {
                    profile: {
                        name: 'Alice',
                        age: 30
                    }
                }
            }
        ]);
    });
    it('handles conflict between flat and nested keys', () => {
        writeCsv('conflict.csv', `
    foo,foo.bar
    "plain","nested"
  `);

        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const result = loadCsvDataAsMap(tmpDir);

        expect(result).toHaveProperty('conflict');
        expect(result['conflict']).toEqual([
            {
                foo: 'plain' // nested key wordt genegeerd door conflict
            }
        ]);

        expect(spy).toHaveBeenCalledWith(
            expect.stringContaining('Conflict: "foo" is al als waarde toegewezen')
        );

        spy.mockRestore();
    });

});
