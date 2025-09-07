/**
 * SYMBOL EXTRACTOR
 *
 * ROLE: Extracts symbols (functions, classes, variables) from code for indexing
 *
 * LANGUAGE STRATEGY:
 * - CORE LANGUAGES (JS/TS/Python/HTML/CSS/JSON/YAML): Full Tree-sitter symbol extraction
 * - SECONDARY LANGUAGES (Everything else): Basic symbol extraction with limited parsing
 *
 * IMPORTS:
 * - ProcessedFile from shared/types
 * - ASTNode from shared/types
 * - Tree-sitter parsers for core languages only
 * - Language-specific symbol extractors
 * - Content-based analyzers for secondary languages
 *
 * EXPORTS:
 * - SymbolExtractor class
 * - Language-specific symbol extraction methods
 * - Symbol validation utilities
 *
 * PROCESS:
 * 1. Categorizes files by language priority (core/secondary)
 * 2. CORE LANGUAGES: Full Tree-sitter AST traversal + comprehensive symbol extraction
 * 3. SECONDARY LANGUAGES: Basic AST parsing + limited symbol extraction + content analysis
 * 4. Builds unified symbol index with different quality levels per language
 *
 * CORE LANGUAGE SYMBOL EXTRACTION (JS/TS/Python/HTML/CSS/JSON/YAML):
 * - Full AST traversal with Tree-sitter
 * - Comprehensive symbol metadata extraction
 * - Relationship detection (inheritance, composition, dependencies)
 * - Cross-reference resolution
 * - Documentation extraction (JSDoc, docstrings, comments)
 *
 * SECONDARY LANGUAGE SYMBOL EXTRACTION (Java/Go/PHP/Rust/C#/Ruby/etc):
 * - Basic AST parsing where possible
 * - Limited symbol metadata extraction
 * - Simple relationship detection
 * - Content-based documentation extraction
 * - Pattern-based symbol detection
 *
 * SYMBOL TYPES EXTRACTED (by language priority):
 * - CORE: Functions, classes, variables, imports, exports, constants, enums, interfaces, types
 * - SECONDARY: Functions, classes, variables, imports, exports (limited)
 *
 * SYMBOL METADATA (quality varies by language):
 * - Name: Symbol name
 * - Type: Function, class, variable, etc.
 * - Location: File path, line, column
 * - Signature: Function signature or type definition (core languages only)
 * - Scope: Global, module, class, function
 * - Visibility: Public, private, protected (core languages only)
 * - Documentation: Associated comments/docstrings
 * - Dependencies: What this symbol depends on (core languages only)
 * - Dependents: What depends on this symbol (core languages only)
 * - Quality: High (core), Medium (secondary)
 *
 * USAGE:
 * - Called by AnalysisProcessor for symbol extraction
 * - Input: ProcessedFile[] with content from Discovery (ALL file types)
 * - Output: SymbolIndex with different quality levels per language
 * - Used by dependency mapping and code chunking
 */

import { readFile } from 'fs/promises';
import { ProcessedFile, SymbolInfo, ASTNode, Reference, Scope } from '../../shared/types.js';
import { isCoreLanguage, CORE_EXTENSIONS } from '../../shared/constants.js';
import { defaultParserRegistry } from '../../shared/parsers.js';

export class SymbolExtractor {
  private errors: Array<{ file: string; error: string }> = [];
  private parserRegistry = defaultParserRegistry.instance;

  constructor() {}

  /**
   * Extract symbols from processed files based on language priority
   */
  async extractSymbols(
    files: Array<ProcessedFile & { content?: string | null }>
  ): Promise<Map<string, SymbolInfo[]>> {
    const symbolMap = new Map<string, SymbolInfo[]>();

    // Process files in parallel for better performance
    const promises = files.map(async file => {
      try {
        const symbols = await this.extractFromFile(file);
        return { file: file.path, symbols };
      } catch (error) {
        this.errors.push({
          file: file.path,
          error: error instanceof Error ? error.message : String(error),
        });
        return { file: file.path, symbols: [] };
      }
    });

    const results = await Promise.all(promises);
    results.forEach(({ file, symbols }) => {
      symbolMap.set(file, symbols);
    });

    return symbolMap;
  }

  /**
   * Extract symbols from a single file
   */
  private async extractFromFile(
    file: ProcessedFile & { content?: string | null }
  ): Promise<SymbolInfo[]> {
    if (!file.fileInfo.isReadable || file.isDirectory) {
      return [];
    }

    try {
      // Use content from file object if available, otherwise read from disk
      let content: string;
      if (file.content) {
        content = file.content;
      } else {
        content = await readFile(file.path, 'utf-8');
      }

      const extension = file.extension.toLowerCase();

      if (isCoreLanguage(extension)) {
        return this.extractCoreSymbols(file, content);
      } else {
        return this.extractSecondarySymbols(file, content);
      }
    } catch (error) {
      throw new Error(
        `Failed to read file: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Extract symbols from core languages using available parsers
   */
  private async extractCoreSymbols(file: ProcessedFile, content: string): Promise<SymbolInfo[]> {
    const extension = file.extension.toLowerCase();
    const parser = this.parserRegistry.getParser(extension);

    if (!parser) {
      console.log(`⚠️  No parser found for ${extension} in ${file.path}, using basic extraction`);
      return this.extractBasicSymbols(file, content);
    }

    console.log(`🔍 Using parser: ${parser.constructor.name} for ${file.path}`);

    try {
      const parseResult = await parser.parse(content);
      if (!parseResult.success || !parseResult.ast) {
        console.log(
          `⚠️  Parse failed for ${file.path}: ${parseResult.error || 'Unknown error'}, using basic extraction`
        );
        return this.extractBasicSymbols(file, content);
      }

      // Check if this is a Tree-sitter parser (has rootNode) or other parser
      const ast = parseResult.ast;
      if (ast.rootNode) {
        // Tree-sitter parser
        const symbols = this.extractSymbolsFromAST(file, ast, 'core');
        if (symbols.length > 0) {
          console.log(`✅ Extracted ${symbols.length} symbols from ${file.path} using Tree-sitter`);
        }
        return symbols;
      } else if (ast.statements || ast.getChildCount) {
        // TypeScript parser (createSourceFile) - use TypeScript AST extraction
        console.log(`🔍 TypeScript AST structure for ${file.path}:`, {
          type: 'TypeScript',
          hasStatements: !!ast.statements,
          statementsLength: ast.statements?.length || 0,
          hasGetChildCount: !!ast.getChildCount,
        });
        const symbols = this.extractSymbolsFromTypeScriptAST(file, ast, 'core');
        if (symbols.length > 0) {
          console.log(
            `✅ Extracted ${symbols.length} symbols from ${file.path} using TypeScript parser`
          );
        } else {
          console.log(`⚠️  No symbols extracted from ${file.path} using TypeScript parser`);
        }
        return symbols;
      } else {
        // Babel parser - use different extraction method
        console.log(`🔍 Babel AST structure for ${file.path}:`, {
          type: ast.type,
          hasBody: !!ast.body,
          bodyLength: ast.body?.length || 0,
          firstNodeType: ast.body?.[0]?.type,
        });
        const symbols = this.extractSymbolsFromBabelAST(file, ast, 'core');
        if (symbols.length > 0) {
          console.log(
            `✅ Extracted ${symbols.length} symbols from ${file.path} using Babel parser`
          );
        } else {
          console.log(`⚠️  No symbols extracted from ${file.path} using Babel parser`);
        }
        return symbols;
      }
    } catch (error) {
      console.log(`⚠️  Parse error for ${file.path}: ${error}, using basic extraction`);
      // Fallback to basic extraction on parse error
      return this.extractBasicSymbols(file, content);
    }
  }

  /**
   * Extract symbols from secondary languages using basic parsing
   */
  private async extractSecondarySymbols(
    file: ProcessedFile,
    content: string
  ): Promise<SymbolInfo[]> {
    const extension = file.extension.toLowerCase();
    const parser = this.parserRegistry.getParser(extension);

    if (!parser) {
      return this.extractBasicSymbols(file, content);
    }

    try {
      const parseResult = await parser.parse(content);
      if (!parseResult.success || !parseResult.ast) {
        return this.extractBasicSymbols(file, content);
      }

      return this.extractSymbolsFromAST(file, parseResult.ast, 'secondary');
    } catch (error) {
      // Fallback to basic extraction on parse error
      return this.extractBasicSymbols(file, content);
    }
  }

  /**
   * Extract symbols from AST using Tree-sitter
   */
  private extractSymbolsFromAST(
    file: ProcessedFile,
    ast: any,
    quality: 'core' | 'secondary'
  ): SymbolInfo[] {
    const symbols: SymbolInfo[] = [];

    if (!ast || !ast.rootNode) {
      return symbols;
    }

    // Traverse AST to find symbols
    this.traverseAST(ast.rootNode, file, symbols, quality);

    return symbols;
  }

  /**
   * Extract symbols from Babel/TypeScript AST
   */
  private extractSymbolsFromBabelAST(
    file: ProcessedFile,
    ast: any,
    quality: 'core' | 'secondary'
  ): SymbolInfo[] {
    const symbols: SymbolInfo[] = [];

    if (!ast || !ast.body) {
      return symbols;
    }

    // Traverse Babel AST to find symbols
    this.traverseBabelAST(ast, file, symbols, quality);

    return symbols;
  }

  /**
   * Extract symbols from TypeScript AST (createSourceFile)
   */
  private extractSymbolsFromTypeScriptAST(
    file: ProcessedFile,
    ast: any,
    quality: 'core' | 'secondary'
  ): SymbolInfo[] {
    const symbols: SymbolInfo[] = [];

    if (!ast) {
      return symbols;
    }

    // Traverse TypeScript AST to find symbols
    this.traverseTypeScriptAST(ast, file, symbols, quality);

    return symbols;
  }

  /**
   * Traverse AST nodes to extract symbols
   */
  private traverseAST(
    node: any,
    file: ProcessedFile,
    symbols: SymbolInfo[],
    quality: 'core' | 'secondary'
  ): void {
    if (!node) return;

    // Extract symbols based on node type
    const symbol = this.extractSymbolFromNode(node, file, quality);
    if (symbol) {
      symbols.push(symbol);
    }

    // Recursively traverse children
    if (node.children) {
      node.children.forEach((child: any) => {
        this.traverseAST(child, file, symbols, quality);
      });
    }
  }

  /**
   * Traverse Babel/TypeScript AST nodes to extract symbols
   */
  private traverseBabelAST(
    node: any,
    file: ProcessedFile,
    symbols: SymbolInfo[],
    quality: 'core' | 'secondary'
  ): void {
    if (!node) return;

    // Extract symbols based on node type
    const symbol = this.extractSymbolFromBabelNode(node, file, quality);
    if (symbol) {
      symbols.push(symbol);
    }

    // Recursively traverse children
    if (node.body && Array.isArray(node.body)) {
      node.body.forEach((child: any) => {
        this.traverseBabelAST(child, file, symbols, quality);
      });
    }

    // Traverse other common properties
    const childProperties = [
      'declarations',
      'params',
      'properties',
      'elements',
      'consequent',
      'alternate',
      'test',
      'left',
      'right',
    ];
    childProperties.forEach(prop => {
      if (node[prop]) {
        if (Array.isArray(node[prop])) {
          node[prop].forEach((child: any) => {
            this.traverseBabelAST(child, file, symbols, quality);
          });
        } else {
          this.traverseBabelAST(node[prop], file, symbols, quality);
        }
      }
    });
  }

  /**
   * Traverse TypeScript AST nodes to extract symbols
   */
  private traverseTypeScriptAST(
    node: any,
    file: ProcessedFile,
    symbols: SymbolInfo[],
    quality: 'core' | 'secondary'
  ): void {
    if (!node) return;

    // Extract symbols based on node type
    const symbol = this.extractSymbolFromTypeScriptNode(node, file, quality);
    if (symbol) {
      symbols.push(symbol);
    }

    // Traverse child nodes using TypeScript's forEachChild
    if (node.forEachChild) {
      node.forEachChild((child: any) => {
        this.traverseTypeScriptAST(child, file, symbols, quality);
      });
    }

    // Also traverse statements if available
    if (node.statements && Array.isArray(node.statements)) {
      node.statements.forEach((child: any) => {
        this.traverseTypeScriptAST(child, file, symbols, quality);
      });
    }
  }

  /**
   * Extract symbol from a specific Babel/TypeScript AST node
   */
  private extractSymbolFromBabelNode(
    node: any,
    file: ProcessedFile,
    quality: 'core' | 'secondary'
  ): SymbolInfo | null {
    const nodeType = node.type;

    // Common symbol patterns for Babel/TypeScript AST
    const symbolPatterns = {
      // Function definitions
      function: [
        'FunctionDeclaration',
        'FunctionExpression',
        'ArrowFunctionExpression',
        'MethodDefinition',
      ],
      // Class definitions
      class: [
        'ClassDeclaration',
        'ClassExpression',
        'TSInterfaceDeclaration',
        'TSTypeAliasDeclaration',
      ],
      // Variable declarations
      variable: ['VariableDeclaration', 'VariableDeclarator'],
      // Import/Export statements
      import: [
        'ImportDeclaration',
        'ImportDefaultSpecifier',
        'ImportSpecifier',
        'ImportNamespaceSpecifier',
      ],
      export: ['ExportNamedDeclaration', 'ExportDefaultDeclaration', 'ExportAllDeclaration'],
      // Type definitions
      type: ['TSTypeAliasDeclaration', 'TSInterfaceDeclaration', 'TSTypeParameter'],
      // Constants
      constant: ['VariableDeclaration'],
      // Enums
      enum: ['TSEnumDeclaration'],
    };

    // Determine symbol type based on node type
    let symbolType: SymbolInfo['type'] = 'variable';
    for (const [type, patterns] of Object.entries(symbolPatterns)) {
      if (patterns.includes(nodeType)) {
        symbolType = type as SymbolInfo['type'];
        break;
      }
    }

    // Extract symbol name
    const name = this.extractSymbolName(node, nodeType);
    if (!name) return null;

    // Extract basic metadata
    const lineStart = node.loc?.start?.line || 1;
    const lineEnd = node.loc?.end?.line || lineStart;
    const columnStart = node.loc?.start?.column || 0;
    const columnEnd = node.loc?.end?.column || columnStart;

    // Create symbol info with quality-appropriate metadata
    const symbol: SymbolInfo = {
      name,
      type: symbolType,
      scope: this.extractScope(node, file),
      declaration: this.createBabelASTNode(node),
      references: [], // Will be populated by dependency mapper
      lineStart,
      lineEnd,
      columnStart,
      columnEnd,
      isExported: this.isExported(node, nodeType),
      isImported: this.isBabelImported(node, nodeType),
    };

    // Add quality-specific metadata
    if (quality === 'core') {
      symbol.signature = this.extractBabelSignature(node, nodeType);
      symbol.docstring = this.extractBabelDocumentation(node, nodeType);
    }

    return symbol;
  }

  /**
   * Extract symbol from a specific TypeScript AST node
   */
  private extractSymbolFromTypeScriptNode(
    node: any,
    file: ProcessedFile,
    quality: 'core' | 'secondary'
  ): SymbolInfo | null {
    const nodeKind = node.kind;

    // TypeScript node kinds for common symbols
    const symbolKinds = {
      // Function definitions
      function: [258, 259, 260], // FunctionDeclaration, MethodDeclaration, Constructor
      // Class definitions
      class: [260, 261, 262], // ClassDeclaration, InterfaceDeclaration, TypeAliasDeclaration
      // Variable declarations
      variable: [257, 258], // VariableDeclaration, LetDeclaration, ConstDeclaration
      // Import/Export statements
      import: [268, 269, 270], // ImportDeclaration, ImportClause, ImportSpecifier
      export: [271, 272, 273], // ExportDeclaration, ExportAssignment, ExportSpecifier
      // Type definitions
      type: [261, 262, 263], // InterfaceDeclaration, TypeAliasDeclaration, EnumDeclaration
      // Constants
      constant: [258], // ConstDeclaration
      // Enums
      enum: [263], // EnumDeclaration
    };

    // Determine symbol type based on node kind
    let symbolType: SymbolInfo['type'] = 'variable';
    for (const [type, kinds] of Object.entries(symbolKinds)) {
      if (kinds.includes(nodeKind)) {
        symbolType = type as SymbolInfo['type'];
        break;
      }
    }

    // Extract symbol name
    const name = this.extractTypeScriptSymbolName(node, nodeKind);
    if (!name) return null;

    // Extract basic metadata
    const sourceFile = node.getSourceFile ? node.getSourceFile() : null;
    const lineStart = sourceFile
      ? sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1
      : 1;
    const lineEnd = sourceFile
      ? sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1
      : lineStart;
    const columnStart = sourceFile
      ? sourceFile.getLineAndCharacterOfPosition(node.getStart()).character
      : 0;
    const columnEnd = sourceFile
      ? sourceFile.getLineAndCharacterOfPosition(node.getEnd()).character
      : columnStart;

    // Create symbol info with quality-appropriate metadata
    const symbol: SymbolInfo = {
      name,
      type: symbolType,
      scope: this.extractTypeScriptScope(node, file),
      declaration: this.createTypeScriptASTNode(node),
      references: [], // Will be populated by dependency mapper
      lineStart,
      lineEnd,
      columnStart,
      columnEnd,
      isExported: this.isTypeScriptExported(node, nodeKind),
      isImported: this.isTypeScriptImported(node, nodeKind),
    };

    // Add quality-specific metadata
    if (quality === 'core') {
      symbol.signature = this.extractTypeScriptSignature(node, nodeKind);
      symbol.docstring = this.extractTypeScriptDocumentation(node, nodeKind);
    }

    return symbol;
  }

  /**
   * Extract symbol from a specific AST node
   */
  private extractSymbolFromNode(
    node: any,
    file: ProcessedFile,
    quality: 'core' | 'secondary'
  ): SymbolInfo | null {
    const nodeType = node.type;
    const nodeText = node.text || '';

    // Common symbol patterns across languages
    const symbolPatterns = {
      // Function definitions
      function: [
        'function_declaration',
        'method_definition',
        'function_definition',
        'arrow_function',
      ],
      // Class definitions
      class: ['class_declaration', 'class_definition', 'interface_declaration'],
      // Variable declarations
      variable: ['variable_declaration', 'const_declaration', 'let_declaration', 'var_declaration'],
      // Import/Export statements
      import: ['import_statement', 'import_declaration'],
      export: ['export_statement', 'export_declaration'],
      // Type definitions
      type: ['type_alias_declaration', 'interface_declaration', 'type_definition'],
      // Constants
      constant: ['const_declaration', 'constant_declaration'],
      // Enums
      enum: ['enum_declaration', 'enum_definition'],
    };

    // Determine symbol type based on node type
    let symbolType: SymbolInfo['type'] = 'variable';
    for (const [type, patterns] of Object.entries(symbolPatterns)) {
      if (patterns.some(pattern => nodeType.includes(pattern))) {
        symbolType = type as SymbolInfo['type'];
        break;
      }
    }

    // Extract symbol name
    const name = this.extractSymbolName(node, nodeType);
    if (!name) return null;

    // Extract basic metadata
    const lineStart = node.startPosition?.row + 1 || 1;
    const lineEnd = node.endPosition?.row + 1 || lineStart;
    const columnStart = node.startPosition?.column || 0;
    const columnEnd = node.endPosition?.column || columnStart;

    // Create symbol info with quality-appropriate metadata
    const symbol: SymbolInfo = {
      name,
      type: symbolType,
      scope: this.extractScope(node, file),
      declaration: this.createASTNode(node),
      references: [], // Will be populated by dependency mapper
      lineStart,
      lineEnd,
      columnStart,
      columnEnd,
      isExported: this.isExported(node, nodeType),
      isImported: this.isImported(node, nodeType),
    };

    // Add quality-specific metadata
    if (quality === 'core') {
      symbol.signature = this.extractSignature(node, nodeType);
      symbol.docstring = this.extractDocumentation(node, nodeType);
    }

    return symbol;
  }

  /**
   * Extract symbol name from AST node
   */
  private extractSymbolName(node: any, nodeType: string): string | null {
    // Try to find name in different possible locations
    const nameFields = ['name', 'identifier', 'value', 'text'];

    for (const field of nameFields) {
      if (node[field] && typeof node[field] === 'string') {
        return node[field];
      }
    }

    // Try to find name in children
    if (node.children) {
      for (const child of node.children) {
        if (child.type === 'identifier' || child.type === 'property_identifier') {
          return child.text || child.name;
        }
      }
    }

    // Fallback: extract from text content
    if (node.text) {
      const text = node.text.trim();
      const words = text.split(/\s+/);
      if (words.length > 0) {
        return words[0];
      }
    }

    return null;
  }

  /**
   * Extract scope information
   */
  private extractScope(node: any, file: ProcessedFile): string {
    // Simple scope detection - can be enhanced
    if (node.type?.includes('class')) return 'class';
    if (node.type?.includes('function')) return 'function';
    if (node.type?.includes('module')) return 'module';
    return 'global';
  }

  /**
   * Check if symbol is exported
   */
  private isExported(node: any, nodeType: string): boolean {
    return (
      nodeType.includes('export') ||
      node.parent?.type?.includes('export') ||
      node.text?.includes('export')
    );
  }

  /**
   * Check if symbol is imported
   */
  private isImported(node: any, nodeType: string): boolean {
    return (
      nodeType.includes('import') ||
      node.parent?.type?.includes('import') ||
      node.text?.includes('import')
    );
  }

  /**
   * Extract function signature (core languages only)
   */
  private extractSignature(node: any, nodeType: string): string | undefined {
    if (!nodeType.includes('function') && !nodeType.includes('method')) {
      return undefined;
    }

    // Extract parameters and return type
    const params = this.extractParameters(node);
    const returnType = this.extractReturnType(node);

    return `${node.text}(${params.join(', ')})${returnType ? `: ${returnType}` : ''}`;
  }

  /**
   * Extract parameters from function node
   */
  private extractParameters(node: any): string[] {
    const params: string[] = [];

    if (node.children) {
      for (const child of node.children) {
        if (child.type?.includes('parameter') || child.type?.includes('argument')) {
          const paramName = child.text || child.name || 'param';
          params.push(paramName);
        }
      }
    }

    return params;
  }

  /**
   * Extract return type from function node
   */
  private extractReturnType(node: any): string | undefined {
    if (node.children) {
      for (const child of node.children) {
        if (child.type?.includes('type') || child.type?.includes('return')) {
          return child.text || child.name;
        }
      }
    }
    return undefined;
  }

  /**
   * Extract documentation (core languages only)
   */
  private extractDocumentation(node: any, nodeType: string): string | undefined {
    // Look for JSDoc, docstrings, or comments
    if (node.children) {
      for (const child of node.children) {
        if (child.type?.includes('comment') || child.type?.includes('docstring')) {
          return child.text;
        }
      }
    }
    return undefined;
  }

  /**
   * Create ASTNode from Tree-sitter node
   */
  private createASTNode(node: any): ASTNode {
    return {
      type: node.type,
      children: node.children?.map((child: any) => this.createASTNode(child)),
      value: node.text,
      start: node.startPosition?.row,
      end: node.endPosition?.row,
    };
  }

  /**
   * Basic symbol extraction using content analysis (fallback)
   */
  private extractBasicSymbols(file: ProcessedFile, content: string): SymbolInfo[] {
    const symbols: SymbolInfo[] = [];
    const lines = content.split('\n');

    // Basic regex patterns for common symbols
    const patterns = {
      function: /(?:function|def|fn|func)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
      class: /(?:class|interface|struct|enum)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
      variable: /(?:let|const|var|val|final)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
      import: /(?:import|require|from)\s+['"]([^'"]+)['"]/g,
      export: /(?:export|module\.exports)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
    };

    lines.forEach((line, index) => {
      for (const [type, pattern] of Object.entries(patterns)) {
        let match;
        while ((match = pattern.exec(line)) !== null) {
          symbols.push({
            name: match[1],
            type: type as SymbolInfo['type'],
            scope: 'global',
            declaration: { type: 'basic', value: line.trim() },
            references: [],
            lineStart: index + 1,
            lineEnd: index + 1,
            columnStart: match.index,
            columnEnd: match.index + match[0].length,
            isExported: line.includes('export'),
            isImported: line.includes('import'),
          });
        }
      }
    });

    if (symbols.length > 0) {
      console.log(
        `✅ Extracted ${symbols.length} symbols from ${file.path} using basic extraction`
      );
    }
    return symbols;
  }

  /**
   * Get extraction errors
   */
  getErrors(): Array<{ file: string; error: string }> {
    return [...this.errors];
  }

  /**
   * Clear extraction errors
   */
  clearErrors(): void {
    this.errors = [];
  }

  // Helper methods for Babel/TypeScript AST extraction
  private extractBabelSymbolName(node: any, nodeType: string): string | null {
    // Try to find name in different possible locations
    if (node.id && node.id.name) {
      return node.id.name;
    }
    if (node.name) {
      return node.name;
    }
    if (node.key && node.key.name) {
      return node.key.name;
    }
    if (node.declarations && node.declarations[0] && node.declarations[0].id) {
      return node.declarations[0].id.name;
    }
    return null;
  }

  private extractBabelScope(node: any, file: ProcessedFile): string {
    if (node.type?.includes('Class')) return 'class';
    if (node.type?.includes('Function')) return 'function';
    if (node.type?.includes('Module')) return 'module';
    return 'global';
  }

  private isBabelExported(node: any, nodeType: string): boolean {
    return (
      nodeType.includes('Export') ||
      node.exported === true ||
      node.exportKind === 'value' ||
      node.exportKind === 'type'
    );
  }

  private isBabelImported(node: any, nodeType: string): boolean {
    return nodeType.includes('Import') || node.importKind === 'value' || node.importKind === 'type';
  }

  private extractBabelSignature(node: any, nodeType: string): string | undefined {
    if (!nodeType.includes('Function') && !nodeType.includes('Method')) {
      return undefined;
    }

    const params = this.extractBabelParameters(node);
    const returnType = this.extractBabelReturnType(node);

    return `${node.id?.name || 'function'}(${params.join(', ')})${returnType ? `: ${returnType}` : ''}`;
  }

  private extractBabelParameters(node: any): string[] {
    const params: string[] = [];

    if (node.params) {
      node.params.forEach((param: any) => {
        if (param.name) {
          params.push(param.name);
        } else if (param.type === 'RestElement') {
          params.push(`...${param.argument.name}`);
        }
      });
    }

    return params;
  }

  private extractBabelReturnType(node: any): string | undefined {
    if (node.returnType && node.returnType.typeAnnotation) {
      return this.getTypeAnnotationText(node.returnType.typeAnnotation);
    }
    return undefined;
  }

  private getTypeAnnotationText(typeNode: any): string {
    if (typeNode.type === 'TSTypeReference' && typeNode.typeName) {
      return typeNode.typeName.name;
    }
    if (typeNode.type === 'TSStringKeyword') return 'string';
    if (typeNode.type === 'TSNumberKeyword') return 'number';
    if (typeNode.type === 'TSBooleanKeyword') return 'boolean';
    if (typeNode.type === 'TSVoidKeyword') return 'void';
    if (typeNode.type === 'TSAnyKeyword') return 'any';
    return typeNode.type || 'unknown';
  }

  private extractBabelDocumentation(node: any, nodeType: string): string | undefined {
    // Look for JSDoc comments
    if (node.leadingComments) {
      for (const comment of node.leadingComments) {
        if (comment.type === 'CommentBlock' && comment.value.includes('*')) {
          return comment.value;
        }
      }
    }
    return undefined;
  }

  private createBabelASTNode(node: any): ASTNode {
    return {
      type: node.type,
      children: node.body
        ? node.body.map((child: any) => this.createBabelASTNode(child))
        : undefined,
      value: node.name || node.value,
      start: node.loc?.start?.line,
      end: node.loc?.end?.line,
    };
  }

  // Helper methods for TypeScript AST extraction
  private extractTypeScriptSymbolName(node: any, nodeKind: number): string | null {
    // Try to find name in different possible locations based on node kind
    if (node.name && node.name.text) {
      return node.name.text;
    }
    if (node.declarationList && node.declarationList.declarations) {
      const firstDecl = node.declarationList.declarations[0];
      if (firstDecl && firstDecl.name && firstDecl.name.text) {
        return firstDecl.name.text;
      }
    }
    if (node.declarations && node.declarations[0] && node.declarations[0].name) {
      return node.declarations[0].name.text;
    }
    return null;
  }

  private extractTypeScriptScope(node: any, file: ProcessedFile): string {
    if (node.kind === 260) return 'class'; // ClassDeclaration
    if (node.kind === 258 || node.kind === 259) return 'function'; // FunctionDeclaration, MethodDeclaration
    if (node.kind === 261) return 'interface'; // InterfaceDeclaration
    return 'global';
  }

  private isTypeScriptExported(node: any, nodeKind: number): boolean {
    return !!(node.modifiers && node.modifiers.some((mod: any) => mod.kind === 93)); // ExportKeyword
  }

  private isTypeScriptImported(node: any, nodeKind: number): boolean {
    return nodeKind === 268 || nodeKind === 269 || nodeKind === 270; // ImportDeclaration, ImportClause, ImportSpecifier
  }

  private extractTypeScriptSignature(node: any, nodeKind: number): string | undefined {
    if (nodeKind !== 258 && nodeKind !== 259) {
      // Not FunctionDeclaration or MethodDeclaration
      return undefined;
    }

    const name = node.name?.text || 'function';
    const params = this.extractTypeScriptParameters(node);
    const returnType = this.extractTypeScriptReturnType(node);

    return `${name}(${params.join(', ')})${returnType ? `: ${returnType}` : ''}`;
  }

  private extractTypeScriptParameters(node: any): string[] {
    const params: string[] = [];

    if (node.parameters) {
      node.parameters.forEach((param: any) => {
        if (param.name && param.name.text) {
          params.push(param.name.text);
        }
      });
    }

    return params;
  }

  private extractTypeScriptReturnType(node: any): string | undefined {
    if (node.type && node.type.typeName) {
      return node.type.typeName.text;
    }
    if (node.type && node.type.kind) {
      // Map TypeScript type kinds to string representations
      const typeMap: { [key: number]: string } = {
        134: 'string', // StringKeyword
        135: 'number', // NumberKeyword
        136: 'boolean', // BooleanKeyword
        137: 'void', // VoidKeyword
        138: 'any', // AnyKeyword
        139: 'unknown', // UnknownKeyword
        140: 'never', // NeverKeyword
        141: 'object', // ObjectKeyword
      };
      return typeMap[node.type.kind] || 'unknown';
    }
    return undefined;
  }

  private extractTypeScriptDocumentation(node: any, nodeKind: number): string | undefined {
    // Look for JSDoc comments in leading trivia
    if (node.getLeadingTriviaWidth && node.getLeadingTriviaWidth() > 0) {
      const sourceFile = node.getSourceFile ? node.getSourceFile() : null;
      if (sourceFile) {
        const start = node.getFullStart();
        const end = node.getStart();
        const trivia = sourceFile.getFullText().substring(start, end);
        const jsdocMatch = trivia.match(/\/\*\*[\s\S]*?\*\//);
        if (jsdocMatch) {
          return jsdocMatch[0];
        }
      }
    }
    return undefined;
  }

  private createTypeScriptASTNode(node: any): ASTNode {
    return {
      type: `TypeScript_${node.kind}`,
      children: undefined, // TypeScript nodes don't have a simple children array
      value: node.name?.text || node.text || '',
      start: node.getStart ? node.getStart() : undefined,
      end: node.getEnd ? node.getEnd() : undefined,
    };
  }
}
