/**
 * util tests
 */

var fs = require('fs');

describe('util spec', function() {

    var util, JS2TS;
    beforeEach(function() {
        util = require('../src/ts-out/util');
        JS2TS = require('../src/ts-out/JS2TS');
    });

    it('should generate a valid new block id', function() {
        expect(util.NewBlockID('FUNCTION')).toMatch(util.GetRegexToExactMatchBlock());
        expect(util.NewBlockID('IF')).toMatch(util.GetRegexToFindAllBlocks());
    });
    it('should detect if string is a block id', function() {
        expect(util.IsBlockID('@BLOCK_IF_123456789@')).toBe(true);
        // because we aren't passing any block type
        expect(util.IsBlockID('@BLOCK_IFF_123456789@')).toBe(true);
        expect(util.IsBlockID('@ BLOCK_IF_123456789@')).toBe(false);
        expect(util.IsBlockID('@BLOCK_IFF_123456789@', util.Blocks.SQUAREBLOCK)).toBe(false);
        expect(util.IsBlockID({})).toBe(false);
    });

    it('should detect if it is a comment block', function() {
        expect(util.IsCommentBlockID('@BLOCK_ARRAY_123456789@')).toBe(false);
        expect(util.IsCommentBlockID('@BLOCK_INCOMMENT_123456789@')).toBe(true);
        expect(util.IsCommentBlockID('@BLOCK_BLCOMMENT_123456789@')).toBe(true);
    });

    it('should detect if it is a variable name', function() {
        expect(util.IsVarName('hello')).toBe(true);
        expect(util.IsVarName('$hello')).toBe(true);
        expect(util.IsVarName('_hel$lo')).toBe(true);
        expect(util.IsVarName('$$$')).toBe(true);
        expect(util.IsVarName('h12ello$')).toBe(true);

        expect(util.IsVarName('123')).toBe(false);
        expect(util.IsVarName('1abc')).toBe(false);
        expect(util.IsVarName(' hello')).toBe(false);
        expect(util.IsVarName('hello ')).toBe(false);
    });

    it('should detect the last matched position correctly', function() {
        expect(util.GetLastMatchedPosition('hello world', /\w+/g)).toBe(6);
        expect(util.GetLastMatchedPosition('hello', /\w+/g)).toBe(0);
        expect(util.GetLastMatchedPosition('hello', /a/g)).toBe(-1);
        expect(() => util.GetLastMatchedPosition('hello', /h/)).toThrow();
    });

    it('should escape dollar', function() {
        expect(util.EscapeDollar('$')).toBe('$$');
    });

    it('minifyCommentsRegexAndStrings should work correctly', function() {
        expect(util.minifyCommentsRegexAndStrings('hello').code).toBe('hello');
        expect(util.minifyCommentsRegexAndStrings('// Hello').code).toMatch(/^@BLOCK_IN/);
        expect(util.minifyCommentsRegexAndStrings('/*Hello*/').code).toMatch(/^@BLOCK_BL/);
        expect(util.minifyCommentsRegexAndStrings('/hello/').code).toMatch(/^@BLOCK_REGEX/);
        expect(util.minifyCommentsRegexAndStrings('/hello\\\\/; a / b;').code).toMatch(/^@BLOCK_REGEX.*b;/);
        expect(util.minifyCommentsRegexAndStrings('"hello"').code).toMatch(/^@BLOCK_STRING_\d+@$/);
        expect(util.minifyCommentsRegexAndStrings('"he\\"llo"').code).toMatch(/^@BLOCK_STRING_\d+@$/);
      //  expect(() => util.minifyCommentsRegexAndStrings('if (1) /a/;')).toThrow();
    });

    it('processCode should work', function() {
        var res = util.processCode('if (1) {console.log(2);}else {no;}');
        expect(res.code)
            .toMatch(/^@BLOCK_IF_\d+@@BLOCK_ELSE_\d+@$/);
        res = util.processCode('if (1) {console.log(2);} else {no;}');
        expect(res.code)
            .toMatch(/^@BLOCK_IF_\d+@\s@BLOCK_ELSE_\d+@$/);

        expect(Object.keys(res.table).length).toBe(6);

        res = util.processCode('function foo() {var x = 1;}');
        expect(res.code)
            .toMatch(/^@BLOCK_FUNCTION_\d+@$/);
        expect(Object.keys(res.table).length).toBe(3);

        res = util.processCode('var y = (function (a, b) {var x = 1;});');
        expect(res.code)
            .toMatch(/^var\sy\s=\s@BLOCK_ROUND/);
        expect(Object.keys(res.table).length).toBe(4);

        res = util.processCode('/*\n*hello\n*/\nvar y = function (a, b) {var x = 1;};');
        expect(res.code)
            .toMatch(/^@BLOCK_BLCOMMENT_\d+@\nvar\sy\s=\s@BLOCK_FUNCTION_\d+@/);
        expect(Object.keys(res.table).length).toBe(4);
    });

    xit('should analyze instructions correctly', function() {
        var content = fs.readFileSync(__dirname + '/test-in-1.txt', 'UTF-8');
        var output = new JS2TS('foo', /return\s+(.*)$/, 1).run(content);
        var expected = fs.readFileSync(__dirname + '/test-out-1.txt', 'UTF-8');
        expected = expected.split('\n').map((s) => s.trim()).filter(s => !!s);
        output = output.split('\n').map((s) => s.trim()).filter(s => !!s);

        if (expected.length !== output.length) {
            throw new Error('output is different');
        }
        output.forEach((line, index) => {
            if (line != expected[index]) {
                throw  new Error('Difference in output found on line: ' + index);
            }
        });
    });
});

