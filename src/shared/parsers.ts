import { parse as parseJSON } from 'jsonc-parser';
import { parse as parseYAML } from 'yaml';
import { parse as parseTOML } from '@iarna/toml';
import { parse as parseINI } from 'ini';
import { parse as parseCSV } from 'csv-parse/sync';
import MarkdownIt from 'markdown-it';
import { parse as parseHTML } from 'node-html-parser';
import { XMLParser as FastXMLParser } from 'fast-xml-parser';
import { parse as parseJS } from '@babel/parser';
import * as parseTS from 'typescript';
import { parse as parseCSS } from 'css-tree';

let Parser: any;
let Python: any;
let Java: any;
let Go: any;
let Rust: any;
let Cpp: any;
let C: any;
let CSharp: any;
let PHP: any;
let Ruby: any;
let Swift: any;
let Kotlin: any;
let Scala: any;
let Groovy: any;
let JavaScript: any;
let TypeScript: any;

// Lazy load specific Tree-sitter modules
async function loadTreeSitterParser(language: string) {
  if (!Parser) {
    Parser = (await import('tree-sitter')).default;
  }
  
  switch (language) {
    case 'python':
      if (!Python) Python = (await import('tree-sitter-python')).default;
      return { Parser, Language: Python };
    case 'java':
      if (!Java) Java = (await import('tree-sitter-java')).default;
      return { Parser, Language: Java };
    case 'go':
      if (!Go) Go = (await import('tree-sitter-go')).default;
      return { Parser, Language: Go };
    case 'rust':
      if (!Rust) Rust = (await import('tree-sitter-rust')).default;
      return { Parser, Language: Rust };
    case 'cpp':
      if (!Cpp) Cpp = (await import('tree-sitter-cpp')).default;
      return { Parser, Language: Cpp };
    case 'c':
      if (!C) C = (await import('tree-sitter-c')).default;
      return { Parser, Language: C };
    case 'csharp':
      if (!CSharp) CSharp = (await import('tree-sitter-c-sharp')).default;
      return { Parser, Language: CSharp };
    case 'javascript':
      if (!JavaScript) JavaScript = (await import('tree-sitter-javascript')).default;
      return { Parser, Language: JavaScript };
    case 'typescript':
      if (!TypeScript) TypeScript = (await import('tree-sitter-typescript')).default;
      return { Parser, Language: TypeScript };
    case 'php':
      if (!PHP) PHP = (await import('tree-sitter-php')).default;
      return { Parser, Language: PHP };
    case 'ruby':
      if (!Ruby) Ruby = (await import('tree-sitter-ruby')).default;
      return { Parser, Language: Ruby };
    case 'swift':
      if (!Swift) Swift = (await import('tree-sitter-swift')).default;
      return { Parser, Language: Swift };
    case 'kotlin':
      if (!Kotlin) Kotlin = (await import('tree-sitter-kotlin')).default;
      return { Parser, Language: Kotlin };
    case 'scala':
      if (!Scala) Scala = (await import('tree-sitter-scala')).default;
      return { Parser, Language: Scala };
    case 'groovy':
      if (!Groovy) Groovy = (await import('tree-sitter-groovy')).default;
      return { Parser, Language: Groovy };
    default:
      throw new Error(`Unsupported language: ${language}`);
  }
}

export interface ParserResult {
  success: boolean;
  data?: any;
  error?: string;
  ast?: any;
  language?: string;
}

export interface FileParser {
  parse(content: string): Promise<ParserResult>;
  canParse(extension: string): boolean;
}

// Base parser class
abstract class BaseParser implements FileParser {
  abstract parse(content: string): Promise<ParserResult>;
  abstract canParse(extension: string): boolean;

  protected safeParse<T>(parseFn: () => T): ParserResult {
    try {
      const result = parseFn();
      return {
        success: true,
        data: result,
        ast: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

// JSON Parser
export class JSONParser extends BaseParser {
  canParse(extension: string): boolean {
    return ['json', 'jsonc', 'json5'].includes(extension.toLowerCase());
  }

  async parse(content: string): Promise<ParserResult> {
    return this.safeParse(() => parseJSON(content));
  }
}

// YAML Parser
export class YAMLParser extends BaseParser {
  canParse(extension: string): boolean {
    return ['yaml', 'yml'].includes(extension.toLowerCase());
  }

  async parse(content: string): Promise<ParserResult> {
    return this.safeParse(() => parseYAML(content));
  }
}

// TOML Parser
export class TOMLParser extends BaseParser {
  canParse(extension: string): boolean {
    return ['toml'].includes(extension.toLowerCase());
  }

  async parse(content: string): Promise<ParserResult> {
    return this.safeParse(() => parseTOML(content));
  }
}

// INI Parser
export class INIParser extends BaseParser {
  canParse(extension: string): boolean {
    return ['ini', 'cfg', 'conf', 'properties'].includes(extension.toLowerCase());
  }

  async parse(content: string): Promise<ParserResult> {
    return this.safeParse(() => parseINI(content));
  }
}

// CSV Parser
export class CSVParser extends BaseParser {
  canParse(extension: string): boolean {
    return ['csv', 'tsv'].includes(extension.toLowerCase());
  }

  async parse(content: string): Promise<ParserResult> {
    return this.safeParse(() => parseCSV(content, { columns: true }));
  }
}

// Markdown Parser
export class MarkdownParser extends BaseParser {
  private md: MarkdownIt;

  constructor() {
    super();
    this.md = new MarkdownIt();
  }

  canParse(extension: string): boolean {
    return ['md', 'markdown', 'mdown', 'mkd', 'mkdn', 'mdtxt', 'mdtext'].includes(
      extension.toLowerCase()
    );
  }

  async parse(content: string): Promise<ParserResult> {
    return this.safeParse(() => this.md.render(content, {}));
  }
}

// HTML Parser
export class HTMLParser extends BaseParser {
  canParse(extension: string): boolean {
    return ['html', 'htm', 'xhtml', 'shtml', 'mhtml'].includes(extension.toLowerCase());
  }

  async parse(content: string): Promise<ParserResult> {
    return this.safeParse(() => parseHTML(content));
  }
}

// XML Parser
export class XMLParser extends BaseParser {
  canParse(extension: string): boolean {
    return ['xml', 'svg', 'rss', 'atom', 'xhtml', 'xsd', 'xsl', 'xslt'].includes(
      extension.toLowerCase()
    );
  }

  async parse(content: string): Promise<ParserResult> {
    return this.safeParse(() => {
      const parser = new FastXMLParser();
      return parser.parse(content);
    });
  }
}

// JavaScript Parser (Babel)
export class JavaScriptParser extends BaseParser {
  canParse(extension: string): boolean {
    return ['js', 'jsx', 'mjs', 'cjs', 'es6', 'es'].includes(extension.toLowerCase());
  }

  async parse(content: string): Promise<ParserResult> {
    return this.safeParse(() =>
      parseJS(content, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript', 'decorators-legacy', 'classProperties', 'objectRestSpread'],
      })
    );
  }
}

// TypeScript Parser
export class TypeScriptParser extends BaseParser {
  canParse(extension: string): boolean {
    return ['ts', 'tsx', 'd.ts', 'mts', 'cts'].includes(extension.toLowerCase());
  }

  async parse(content: string): Promise<ParserResult> {
    return this.safeParse(() =>
      parseTS.createSourceFile('temp.ts', content, parseTS.ScriptTarget.Latest, true)
    );
  }
}

// Python Parser (Tree-sitter)
export class PythonParser extends BaseParser {
  private parser: any = null;

  constructor() {
    super();
  }

  canParse(extension: string): boolean {
    return ['py', 'pyi', 'pyw', 'pyc', 'pyo', 'pyd'].includes(extension.toLowerCase());
  }

  async parse(content: string): Promise<ParserResult> {
    return this.safeParse(async () => {
      if (!this.parser) {
        const { Parser, Language } = await loadTreeSitterParser('python');
        this.parser = new Parser();
        this.parser.setLanguage(Language);
      }
      const tree = this.parser.parse(content);
      return {
        ...tree,
        language: 'python',
      };
    });
  }
}

// Java Parser (Tree-sitter)
export class JavaParser extends BaseParser {
  private parser: any = null;

  constructor() {
    super();
  }

  canParse(extension: string): boolean {
    return ['java', 'class', 'jar'].includes(extension.toLowerCase());
  }

  async parse(content: string): Promise<ParserResult> {
    return this.safeParse(async () => {
      if (!this.parser) {
        const { Parser, Language } = await loadTreeSitterParser('java');
        this.parser = new Parser();
        this.parser.setLanguage(Language);
      }
      const tree = this.parser.parse(content);
      return {
        ...tree,
        language: 'java',
      };
    });
  }
}

// Go Parser (Tree-sitter)
export class GoParser extends BaseParser {
  private parser: any = null;

  constructor() {
    super();
  }

  canParse(extension: string): boolean {
    return ['go'].includes(extension.toLowerCase());
  }

  async parse(content: string): Promise<ParserResult> {
    return this.safeParse(async () => {
      if (!this.parser) {
        const { Parser, Language } = await loadTreeSitterParser('go');
        this.parser = new Parser();
        this.parser.setLanguage(Language);
      }
      const tree = this.parser.parse(content);
      return {
        ...tree,
        language: 'go',
      };
    });
  }
}

// Rust Parser (Tree-sitter)
export class RustParser extends BaseParser {
  private parser: any = null;

  constructor() {
    super();
  }

  canParse(extension: string): boolean {
    return ['rs', 'rlib'].includes(extension.toLowerCase());
  }

  async parse(content: string): Promise<ParserResult> {
    return this.safeParse(async () => {
      if (!this.parser) {
        const { Parser, Language } = await loadTreeSitterParser('rust');
        this.parser = new Parser();
        this.parser.setLanguage(Language);
      }
      const tree = this.parser.parse(content);
      return {
        ...tree,
        language: 'rust',
      };
    });
  }
}

// C++ Parser (Tree-sitter)
export class CPPParser extends BaseParser {
  private parser: any = null;

  constructor() {
    super();
  }

  canParse(extension: string): boolean {
    return ['cpp', 'cc', 'cxx', 'c++', 'hpp', 'hxx', 'h++', 'h', 'c'].includes(
      extension.toLowerCase()
    );
  }

  async parse(content: string): Promise<ParserResult> {
    return this.safeParse(async () => {
      if (!this.parser) {
        const { Parser, Language } = await loadTreeSitterParser('cpp');
        this.parser = new Parser();
        this.parser.setLanguage(Language);
      }
      const tree = this.parser.parse(content);
      return {
        ...tree,
        language: 'cpp',
      };
    });
  }
}

// C Parser (Tree-sitter)
export class CParser extends BaseParser {
  private parser: any = null;

  constructor() {
    super();
  }

  canParse(extension: string): boolean {
    return ['c', 'h'].includes(extension.toLowerCase());
  }

  async parse(content: string): Promise<ParserResult> {
    return this.safeParse(async () => {
      if (!this.parser) {
        const { Parser, Language } = await loadTreeSitterParser('c');
        this.parser = new Parser();
        this.parser.setLanguage(Language);
      }
      const tree = this.parser.parse(content);
      return {
        ...tree,
        language: 'c',
      };
    });
  }
}

// C# Parser (Tree-sitter)
export class CSharpParser extends BaseParser {
  private parser: any = null;

  constructor() {
    super();
  }

  canParse(extension: string): boolean {
    return ['cs', 'csx'].includes(extension.toLowerCase());
  }

  async parse(content: string): Promise<ParserResult> {
    return this.safeParse(async () => {
      if (!this.parser) {
        const { Parser, Language } = await loadTreeSitterParser('csharp');
        this.parser = new Parser();
        this.parser.setLanguage(Language);
      }
      const tree = this.parser.parse(content);
      return {
        ...tree,
        language: 'csharp',
      };
    });
  }
}

// PHP Parser (Tree-sitter)
export class PHPParser extends BaseParser {
  private parser: any = null;

  constructor() {
    super();
  }

  canParse(extension: string): boolean {
    return ['php', 'phtml', 'php3', 'php4', 'php5', 'pht', 'phps'].includes(
      extension.toLowerCase()
    );
  }

  async parse(content: string): Promise<ParserResult> {
    return this.safeParse(async () => {
      if (!this.parser) {
        const { Parser, Language } = await loadTreeSitterParser('php');
        this.parser = new Parser();
        this.parser.setLanguage(Language);
      }
      const tree = this.parser.parse(content);
      return {
        ...tree,
        language: 'php',
      };
    });
  }
}

// Ruby Parser (Tree-sitter)
export class RubyParser extends BaseParser {
  private parser: any = null;

  constructor() {
    super();
  }

  canParse(extension: string): boolean {
    return ['rb', 'rbw', 'rake', 'gemspec', 'ru', 'rbx', 'rjs', 'irb'].includes(
      extension.toLowerCase()
    );
  }

  async parse(content: string): Promise<ParserResult> {
    return this.safeParse(async () => {
      if (!this.parser) {
        const { Parser, Language } = await loadTreeSitterParser('ruby');
        this.parser = new Parser();
        this.parser.setLanguage(Language);
      }
      const tree = this.parser.parse(content);
      return {
        ...tree,
        language: 'ruby',
      };
    });
  }
}

// Swift Parser (Tree-sitter)
export class SwiftParser extends BaseParser {
  private parser: any = null;

  constructor() {
    super();
  }

  canParse(extension: string): boolean {
    return ['swift'].includes(extension.toLowerCase());
  }

  async parse(content: string): Promise<ParserResult> {
    return this.safeParse(async () => {
      if (!this.parser) {
        const { Parser, Language } = await loadTreeSitterParser('swift');
        this.parser = new Parser();
        this.parser.setLanguage(Language);
      }
      const tree = this.parser.parse(content);
      return {
        ...tree,
        language: 'swift',
      };
    });
  }
}

// Kotlin Parser (Tree-sitter)
export class KotlinParser extends BaseParser {
  private parser: any = null;

  constructor() {
    super();
  }

  canParse(extension: string): boolean {
    return ['kt', 'kts', 'ktm'].includes(extension.toLowerCase());
  }

  async parse(content: string): Promise<ParserResult> {
    return this.safeParse(async () => {
      if (!this.parser) {
        const { Parser, Language } = await loadTreeSitterParser('kotlin');
        this.parser = new Parser();
        this.parser.setLanguage(Language);
      }
      const tree = this.parser.parse(content);
      return {
        ...tree,
        language: 'kotlin',
      };
    });
  }
}

// Scala Parser (Tree-sitter)
export class ScalaParser extends BaseParser {
  private parser: any = null;

  constructor() {
    super();
  }

  canParse(extension: string): boolean {
    return ['scala', 'sc', 'sbt'].includes(extension.toLowerCase());
  }

  async parse(content: string): Promise<ParserResult> {
    return this.safeParse(async () => {
      if (!this.parser) {
        const { Parser, Language } = await loadTreeSitterParser('scala');
        this.parser = new Parser();
        this.parser.setLanguage(Language);
      }
      const tree = this.parser.parse(content);
      return {
        ...tree,
        language: 'scala',
      };
    });
  }
}

// Groovy Parser (Tree-sitter)
export class GroovyParser extends BaseParser {
  private parser: any = null;

  constructor() {
    super();
  }

  canParse(extension: string): boolean {
    return ['groovy', 'gvy', 'gy', 'gsh', 'gradle'].includes(extension.toLowerCase());
  }

  async parse(content: string): Promise<ParserResult> {
    return this.safeParse(async () => {
      if (!this.parser) {
        const { Parser, Language } = await loadTreeSitterParser('groovy');
        this.parser = new Parser();
        this.parser.setLanguage(Language);
      }
      const tree = this.parser.parse(content);
      return {
        ...tree,
        language: 'groovy',
      };
    });
  }
}

// CSS Parser
export class CSSParser extends BaseParser {
  canParse(extension: string): boolean {
    return ['css', 'scss', 'sass', 'less', 'styl', 'stylus'].includes(extension.toLowerCase());
  }

  async parse(content: string): Promise<ParserResult> {
    return this.safeParse(() => parseCSS(content));
  }
}

// SQL Parser (Basic)
export class SQLParser extends BaseParser {
  canParse(extension: string): boolean {
    return ['sql', 'mysql', 'pgsql', 'sqlite'].includes(extension.toLowerCase());
  }

  async parse(content: string): Promise<ParserResult> {
    return this.safeParse(() => {
      // Basic SQL parsing - split by semicolons and extract basic structure
      const statements = content.split(';').filter(s => s.trim());
      return {
        type: 'sql',
        statements: statements.map(stmt => ({
          text: stmt.trim(),
          type: this.getStatementType(stmt.trim()),
        })),
      };
    });
  }

  private getStatementType(statement: string): string {
    const upper = statement.toUpperCase();
    if (upper.startsWith('SELECT')) return 'SELECT';
    if (upper.startsWith('INSERT')) return 'INSERT';
    if (upper.startsWith('UPDATE')) return 'UPDATE';
    if (upper.startsWith('DELETE')) return 'DELETE';
    if (upper.startsWith('CREATE')) return 'CREATE';
    if (upper.startsWith('DROP')) return 'DROP';
    if (upper.startsWith('ALTER')) return 'ALTER';
    return 'UNKNOWN';
  }
}

// Shell Script Parser (Basic)
export class ShellParser extends BaseParser {
  canParse(extension: string): boolean {
    return ['sh', 'bash', 'zsh', 'fish', 'csh', 'tcsh', 'ksh', 'dash'].includes(
      extension.toLowerCase()
    );
  }

  async parse(content: string): Promise<ParserResult> {
    return this.safeParse(() => {
      // Basic shell script parsing
      const lines = content.split('\n');
      const commands = lines
        .filter(line => line.trim() && !line.trim().startsWith('#'))
        .map(line => line.trim());

      return {
        type: 'shell',
        commands,
        totalLines: lines.length,
        commentLines: lines.filter(line => line.trim().startsWith('#')).length,
      };
    });
  }
}

// Dockerfile Parser (Basic)
export class DockerfileParser extends BaseParser {
  canParse(extension: string): boolean {
    return ['dockerfile', 'docker'].includes(extension.toLowerCase());
  }

  async parse(content: string): Promise<ParserResult> {
    return this.safeParse(() => {
      const lines = content.split('\n');
      const instructions = lines
        .filter(line => line.trim() && !line.trim().startsWith('#'))
        .map(line => {
          const parts = line.trim().split(' ');
          return {
            instruction: parts[0],
            args: parts.slice(1).join(' '),
          };
        });

      return {
        type: 'dockerfile',
        instructions,
        totalLines: lines.length,
      };
    });
  }
}

// YAML Front Matter Parser
export class YAMLFrontMatterParser extends BaseParser {
  canParse(extension: string): boolean {
    return ['md', 'markdown', 'html', 'htm'].includes(extension.toLowerCase());
  }

  async parse(content: string): Promise<ParserResult> {
    return this.safeParse(() => {
      const yamlRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
      const match = content.match(yamlRegex);

      if (match) {
        const frontMatter = parseYAML(match[1]);
        const contentWithoutFrontMatter = content.replace(yamlRegex, '');
        return {
          type: 'yaml-front-matter',
          frontMatter,
          content: contentWithoutFrontMatter,
        };
      }

      return {
        type: 'yaml-front-matter',
        frontMatter: null,
        content,
      };
    });
  }
}

// Universal Text Parser (fallback for all unsupported files)
export class UniversalTextParser extends BaseParser {
  canParse(extension: string): boolean {
    // This parser can handle ANY file type as a fallback
    return true;
  }

  async parse(content: string): Promise<ParserResult> {
    return {
      success: true,
      data: content,
      ast: {
        type: 'text',
        content,
        length: content.length,
        lines: content.split('\n').length,
        characters: content.length,
        words: content.split(/\s+/).filter(word => word.length > 0).length,
      },
    };
  }
}

// Specialized text parsers for specific file types
export class LogParser extends BaseParser {
  canParse(extension: string): boolean {
    return ['log', 'logs', 'out', 'err', 'debug', 'trace'].includes(extension.toLowerCase());
  }

  async parse(content: string): Promise<ParserResult> {
    return this.safeParse(() => {
      const lines = content.split('\n');
      const logEntries = lines.map((line, index) => ({
        lineNumber: index + 1,
        content: line,
        timestamp: this.extractTimestamp(line),
        level: this.extractLogLevel(line),
        message: this.extractMessage(line),
      }));

      return {
        type: 'log',
        entries: logEntries,
        totalLines: lines.length,
        errorLines: logEntries.filter(entry => entry.level === 'ERROR').length,
        warningLines: logEntries.filter(entry => entry.level === 'WARN').length,
      };
    });
  }

  private extractTimestamp(line: string): string | null {
    const timestampRegex =
      /(\d{4}-\d{2}-\d{2}|\d{2}:\d{2}:\d{2}|\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/;
    const match = line.match(timestampRegex);
    return match ? match[1] : null;
  }

  private extractLogLevel(line: string): string | null {
    const levelRegex = /(ERROR|WARN|INFO|DEBUG|TRACE|FATAL)/i;
    const match = line.match(levelRegex);
    return match ? match[1].toUpperCase() : null;
  }

  private extractMessage(line: string): string {
    // Remove timestamp and level to get the actual message
    return line
      .replace(/\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}[.\d]*\s*/, '')
      .replace(/\[(ERROR|WARN|INFO|DEBUG|TRACE|FATAL)\]\s*/i, '')
      .trim();
  }
}

export class ConfigParser extends BaseParser {
  canParse(extension: string): boolean {
    return [
      'conf',
      'config',
      'cfg',
      'ini',
      'properties',
      'env',
      'env.local',
      'env.production',
      'env.development',
    ].includes(extension.toLowerCase());
  }

  async parse(content: string): Promise<ParserResult> {
    return this.safeParse(() => {
      const lines = content.split('\n');
      const config: Record<string, string> = {};
      const comments: Array<{ line: number; comment: string }> = [];

      lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('#')) {
          comments.push({ line: index + 1, comment: trimmed });
        } else if (trimmed.includes('=')) {
          const [key, ...valueParts] = trimmed.split('=');
          const value = valueParts.join('=').trim();
          config[key.trim()] = value;
        }
      });

      return {
        type: 'config',
        config,
        comments,
        totalLines: lines.length,
        configKeys: Object.keys(config).length,
      };
    });
  }
}

export class BinaryParser extends BaseParser {
  canParse(extension: string): boolean {
    return [
      'bin',
      'exe',
      'dll',
      'so',
      'dylib',
      'a',
      'lib',
      'obj',
      'o',
      'elf',
      'dmg',
      'iso',
      'img',
      'zip',
      'tar',
      'gz',
      'bz2',
      '7z',
      'rar',
    ].includes(extension.toLowerCase());
  }

  async parse(content: string): Promise<ParserResult> {
    return {
      success: true,
      data: null, // Don't store binary content
      ast: {
        type: 'binary',
        size: content.length,
        isBinary: true,
        message: 'Binary file detected - content not parsed',
      },
    };
  }
}

export class ImageParser extends BaseParser {
  canParse(extension: string): boolean {
    return [
      'jpg',
      'jpeg',
      'png',
      'gif',
      'bmp',
      'tiff',
      'tif',
      'svg',
      'webp',
      'ico',
      'psd',
      'ai',
      'eps',
      'raw',
      'cr2',
      'nef',
      'orf',
      'sr2',
    ].includes(extension.toLowerCase());
  }

  async parse(content: string): Promise<ParserResult> {
    return {
      success: true,
      data: null, // Don't store image content
      ast: {
        type: 'image',
        size: content.length,
        isImage: true,
        message: 'Image file detected - content not parsed',
      },
    };
  }
}

export class VideoParser extends BaseParser {
  canParse(extension: string): boolean {
    return [
      'mp4',
      'avi',
      'mkv',
      'mov',
      'wmv',
      'flv',
      'webm',
      'm4v',
      '3gp',
      'ogv',
      'mpg',
      'mpeg',
      'm2v',
    ].includes(extension.toLowerCase());
  }

  async parse(content: string): Promise<ParserResult> {
    return {
      success: true,
      data: null,
      ast: {
        type: 'video',
        size: content.length,
        isVideo: true,
        message: 'Video file detected - content not parsed',
      },
    };
  }
}

export class AudioParser extends BaseParser {
  canParse(extension: string): boolean {
    return ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a', 'opus', 'aiff', 'au'].includes(
      extension.toLowerCase()
    );
  }

  async parse(content: string): Promise<ParserResult> {
    return {
      success: true,
      data: null,
      ast: {
        type: 'audio',
        size: content.length,
        isAudio: true,
        message: 'Audio file detected - content not parsed',
      },
    };
  }
}

export class FontParser extends BaseParser {
  canParse(extension: string): boolean {
    return ['ttf', 'otf', 'woff', 'woff2', 'eot', 'svg'].includes(extension.toLowerCase());
  }

  async parse(content: string): Promise<ParserResult> {
    return {
      success: true,
      data: null,
      ast: {
        type: 'font',
        size: content.length,
        isFont: true,
        message: 'Font file detected - content not parsed',
      },
    };
  }
}

export class ArchiveParser extends BaseParser {
  canParse(extension: string): boolean {
    return [
      'zip',
      'tar',
      'gz',
      'bz2',
      '7z',
      'rar',
      'xz',
      'lz',
      'lzma',
      'z',
      'cab',
      'deb',
      'rpm',
      'dmg',
      'iso',
    ].includes(extension.toLowerCase());
  }

  async parse(content: string): Promise<ParserResult> {
    return {
      success: true,
      data: null,
      ast: {
        type: 'archive',
        size: content.length,
        isArchive: true,
        message: 'Archive file detected - content not parsed',
      },
    };
  }
}

export class DocumentParser extends BaseParser {
  canParse(extension: string): boolean {
    return [
      'pdf',
      'doc',
      'docx',
      'xls',
      'xlsx',
      'ppt',
      'pptx',
      'odt',
      'ods',
      'odp',
      'rtf',
      'txt',
    ].includes(extension.toLowerCase());
  }

  async parse(content: string): Promise<ParserResult> {
    return {
      success: true,
      data: content,
      ast: {
        type: 'document',
        size: content.length,
        isDocument: true,
        message: 'Document file detected - basic text extraction only',
      },
    };
  }
}

// Text Parser (for known text files)
export class TextParser extends BaseParser {
  canParse(extension: string): boolean {
    return [
      'txt',
      'text',
      'readme',
      'changelog',
      'license',
      'authors',
      'contributors',
      'todo',
      'notes',
      'memo',
    ].includes(extension.toLowerCase());
  }

  async parse(content: string): Promise<ParserResult> {
    return {
      success: true,
      data: content,
      ast: {
        type: 'text',
        content,
        length: content.length,
        lines: content.split('\n').length,
        characters: content.length,
        words: content.split(/\s+/).filter(word => word.length > 0).length,
      },
    };
  }
}

// Parser Registry
export class ParserRegistry {
  private parsers: Map<string, FileParser> = new Map();

  constructor() {
    this.registerDefaultParsers();
  }

  private async registerDefaultParsers() {
    // Tree-sitter modules are now loaded lazily when needed
    const parserInstances = [
      // Data formats
      new JSONParser(),
      new YAMLParser(),
      new TOMLParser(),
      new INIParser(),
      new CSVParser(),

      // Markup
      new MarkdownParser(),
      new HTMLParser(),
      new XMLParser(),
      new YAMLFrontMatterParser(),

      // Programming languages
      new JavaScriptParser(),
      new TypeScriptParser(),
      new PythonParser(),
      new JavaParser(),
      new GoParser(),
      new RustParser(),
      new CPPParser(),
      new CParser(),
      new CSharpParser(),
      new PHPParser(),
      new RubyParser(),
      new SwiftParser(),
      new KotlinParser(),
      new ScalaParser(),
      new GroovyParser(),

      // Stylesheets
      new CSSParser(),

      // Scripts and configs
      new SQLParser(),
      new ShellParser(),
      new DockerfileParser(),

      // Specialized parsers
      new LogParser(),
      new ConfigParser(),
      new BinaryParser(),
      new ImageParser(),
      new VideoParser(),
      new AudioParser(),
      new FontParser(),
      new ArchiveParser(),
      new DocumentParser(),

      // Text files
      new TextParser(),

      // Universal fallback (must be last)
      new UniversalTextParser(),
    ];

    parserInstances.forEach(parser => {
      const extensions = this.getSupportedExtensions(parser);
      extensions.forEach(ext => {
        // Only set if not already set (allows specific parsers to override universal)
        if (!this.parsers.has(ext)) {
          this.parsers.set(ext, parser);
        }
      });
    });
  }

  private getSupportedExtensions(parser: FileParser): string[] {
    const commonExtensions = [
      // Data formats
      'json',
      'jsonc',
      'json5',
      'yaml',
      'yml',
      'toml',
      'ini',
      'cfg',
      'conf',
      'properties',
      'csv',
      'tsv',

      // Markup
      'md',
      'markdown',
      'mdown',
      'mkd',
      'mkdn',
      'mdtxt',
      'mdtext',
      'html',
      'htm',
      'xhtml',
      'shtml',
      'mhtml',
      'xml',
      'svg',
      'rss',
      'atom',
      'xsd',
      'xsl',
      'xslt',

      // Programming languages
      'js',
      'jsx',
      'mjs',
      'cjs',
      'es6',
      'es',
      'ts',
      'tsx',
      'd.ts',
      'mts',
      'cts',
      'py',
      'pyi',
      'pyw',
      'pyc',
      'pyo',
      'pyd',
      'java',
      'class',
      'jar',
      'go',
      'rs',
      'rlib',
      'cpp',
      'cc',
      'cxx',
      'c++',
      'hpp',
      'hxx',
      'h++',
      'h',
      'c',
      'cs',
      'csx',
      'php',
      'phtml',
      'php3',
      'php4',
      'php5',
      'pht',
      'phps',
      'rb',
      'rbw',
      'rake',
      'gemspec',
      'ru',
      'rbx',
      'rjs',
      'irb',
      'swift',
      'kt',
      'kts',
      'ktm',
      'scala',
      'sc',
      'sbt',
      'groovy',
      'gvy',
      'gy',
      'gsh',
      'gradle',

      // Stylesheets
      'css',
      'scss',
      'sass',
      'less',
      'styl',
      'stylus',

      // Scripts and configs
      'sql',
      'mysql',
      'pgsql',
      'sqlite',
      'sh',
      'bash',
      'zsh',
      'fish',
      'csh',
      'tcsh',
      'ksh',
      'dash',
      'dockerfile',
      'docker',

      // Text
      'txt',
      'log',
      'text',
      'rtf',
      'rst',
      'asciidoc',
      'adoc',
    ];

    return commonExtensions.filter(ext => parser.canParse(ext));
  }

  getParser(extension: string): FileParser | null {
    return this.parsers.get(extension.toLowerCase()) || null;
  }

  getAllSupportedExtensions(): string[] {
    return Array.from(this.parsers.keys());
  }

  async parseFile(content: string, extension: string): Promise<ParserResult> {
    const parser = this.getParser(extension);
    if (!parser) {
      // This should never happen with UniversalTextParser, but just in case
      const universalParser = new UniversalTextParser();
      return await universalParser.parse(content);
    }

    return await parser.parse(content);
  }

  // Get parser info for a file type
  getParserInfo(extension: string): { parser: string; category: string; supported: boolean } {
    const parser = this.getParser(extension);
    if (!parser) {
      return { parser: 'UniversalTextParser', category: 'Text', supported: false };
    }

    const parserName = parser.constructor.name;
    const category = this.getParserCategory(parserName);

    return { parser: parserName, category, supported: true };
  }

  private getParserCategory(parserName: string): string {
    if (
      parserName.includes('JSON') ||
      parserName.includes('YAML') ||
      parserName.includes('TOML') ||
      parserName.includes('INI') ||
      parserName.includes('CSV')
    ) {
      return 'Data Format';
    }
    if (
      parserName.includes('Markdown') ||
      parserName.includes('HTML') ||
      parserName.includes('XML')
    ) {
      return 'Markup';
    }
    if (
      parserName.includes('JavaScript') ||
      parserName.includes('TypeScript') ||
      parserName.includes('Python') ||
      parserName.includes('Java') ||
      parserName.includes('Go') ||
      parserName.includes('Rust') ||
      parserName.includes('Cpp') ||
      parserName.includes('CSharp') ||
      parserName.includes('PHP') ||
      parserName.includes('Ruby') ||
      parserName.includes('Swift') ||
      parserName.includes('Kotlin') ||
      parserName.includes('Scala') ||
      parserName.includes('Groovy')
    ) {
      return 'Programming Language';
    }
    if (parserName.includes('CSS')) {
      return 'Stylesheet';
    }
    if (
      parserName.includes('SQL') ||
      parserName.includes('Shell') ||
      parserName.includes('Dockerfile')
    ) {
      return 'Script/Config';
    }
    if (parserName.includes('Log') || parserName.includes('Config')) {
      return 'Specialized';
    }
    if (
      parserName.includes('Binary') ||
      parserName.includes('Image') ||
      parserName.includes('Video') ||
      parserName.includes('Audio') ||
      parserName.includes('Font') ||
      parserName.includes('Archive') ||
      parserName.includes('Document')
    ) {
      return 'Media/Binary';
    }
    return 'Text';
  }

  // Get statistics about supported file types
  getSupportedFileTypes(): { [category: string]: string[] } {
    const extensions = this.getAllSupportedExtensions();
    const categories = {
      'Data Formats': [
        'json',
        'jsonc',
        'json5',
        'yaml',
        'yml',
        'toml',
        'ini',
        'cfg',
        'conf',
        'properties',
        'csv',
        'tsv',
      ],
      Markup: [
        'md',
        'markdown',
        'mdown',
        'mkd',
        'mkdn',
        'mdtxt',
        'mdtext',
        'html',
        'htm',
        'xhtml',
        'shtml',
        'mhtml',
        'xml',
        'svg',
        'rss',
        'atom',
        'xsd',
        'xsl',
        'xslt',
      ],
      'JavaScript/TypeScript': [
        'js',
        'jsx',
        'mjs',
        'cjs',
        'es6',
        'es',
        'ts',
        'tsx',
        'd.ts',
        'mts',
        'cts',
      ],
      Python: ['py', 'pyi', 'pyw', 'pyc', 'pyo', 'pyd'],
      Java: ['java', 'class', 'jar'],
      Go: ['go'],
      Rust: ['rs', 'rlib'],
      'C/C++': ['cpp', 'cc', 'cxx', 'c++', 'hpp', 'hxx', 'h++', 'h', 'c'],
      'C#': ['cs', 'csx'],
      PHP: ['php', 'phtml', 'php3', 'php4', 'php5', 'pht', 'phps'],
      Ruby: ['rb', 'rbw', 'rake', 'gemspec', 'ru', 'rbx', 'rjs', 'irb'],
      Swift: ['swift'],
      Kotlin: ['kt', 'kts', 'ktm'],
      Scala: ['scala', 'sc', 'sbt'],
      Groovy: ['groovy', 'gvy', 'gy', 'gsh', 'gradle'],
      Stylesheets: ['css', 'scss', 'sass', 'less', 'styl', 'stylus'],
      Scripts: [
        'sql',
        'mysql',
        'pgsql',
        'sqlite',
        'sh',
        'bash',
        'zsh',
        'fish',
        'csh',
        'tcsh',
        'ksh',
        'dash',
        'dockerfile',
        'docker',
      ],
      Text: ['txt', 'log', 'text', 'rtf', 'rst', 'asciidoc', 'adoc'],
    };

    const result: { [category: string]: string[] } = {};
    Object.entries(categories).forEach(([category, exts]) => {
      const supported = exts.filter(ext => extensions.includes(ext));
      if (supported.length > 0) {
        result[category] = supported;
      }
    });

    return result;
  }
}

// Export default registry instance (lazy initialization)
let _defaultParserRegistry: ParserRegistry | null = null;
export const defaultParserRegistry = {
  get instance() {
    if (!_defaultParserRegistry) {
      _defaultParserRegistry = new ParserRegistry();
    }
    return _defaultParserRegistry;
  }
};
