import { Logger } from "./logger.js";

export interface DebugData {
  processEnv: Record<string, string>;
  baseEnv: Record<string, string>;
  overrideEnv: Record<string, string>;
  infisicalSecrets: Record<string, string>;
  cliOverrides: Record<string, string>;
  finalEnv: Record<string, string>;
}

export class DebugRenderer {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  renderTable(data: DebugData, envName?: string): string {
    const allKeys = new Set([
      ...Object.keys(data.processEnv),
      ...Object.keys(data.baseEnv),
      ...Object.keys(data.overrideEnv),
      ...Object.keys(data.infisicalSecrets),
      ...Object.keys(data.cliOverrides),
    ]);

    if (allKeys.size === 0) {
      return "No environment variables found.";
    }

    const winningRows: string[][] = [];
    winningRows.push(["Name", "Source", "Value"]);

    const overriddenRows: string[][] = [];
    overriddenRows.push(["Name", "Source", "Value"]);

    const finalEnv = data.finalEnv;

    // Track all variable entries from all sources
    const allEntries: { key: string; value: string; source: string }[] = [];

    const sources = [
      { name: "CLI Overrides", data: data.cliOverrides },
      { name: "Infisical", data: data.infisicalSecrets },
      { name: `.env.${envName || "override"}`, data: data.overrideEnv },
      { name: ".env", data: data.baseEnv },
      { name: "process", data: data.processEnv },
    ];

    for (const source of sources) {
      for (const key in source.data) {
        allEntries.push({ key, value: source.data[key], source: source.name });
      }
    }

    // Determine winning and overridden variables
    for (const key of Array.from(allKeys).sort()) {
      const finalValue = finalEnv[key];
      let winnerFound = false;

      for (const source of sources) {
        if (source.data[key] !== undefined) {
          const currentValue = source.data[key];
          if (currentValue === finalValue && !winnerFound) {
            winningRows.push([key, source.name, currentValue]);
            winnerFound = true;
          } else {
            overriddenRows.push([key, source.name, currentValue]);
          }
        }
      }
    }

    // Sort rows by source precedence then alphabetically by name
    const sourceOrder: Record<string, number> = {
      "CLI Overrides": 0,
      Infisical: 1,
      [`.env.${envName || "override"}`]: 2,
      ".env": 3,
      process: 4,
    };

    /* v8 ignore next -- @preserve */
    const sortFn = (a: string[], b: string[]) => {
      const aSourceOrder = sourceOrder[a[1] as keyof typeof sourceOrder] ?? 999;
      const bSourceOrder = sourceOrder[b[1] as keyof typeof sourceOrder] ?? 999;

      if (aSourceOrder !== bSourceOrder) {
        return aSourceOrder - bSourceOrder;
      }

      // Same source, sort alphabetically by name
      return a[0].localeCompare(b[0]);
    };
    const winningDataRows = winningRows.slice(1).sort(sortFn);
    const overriddenDataRows = overriddenRows.slice(1).sort(sortFn);

    // Reconstruct rows with header + sorted data
    winningRows.splice(1, winningDataRows.length, ...winningDataRows);
    overriddenRows.splice(1, overriddenDataRows.length, ...overriddenDataRows);

    let output = "Winning Environment Variables\n";
    output += "-----------------------------\n";
    output += this.formatTable(winningRows);
    output += "\n\n";
    output += "Overridden Environment Variables\n";
    output += "------------------------------\n";
    output += this.formatTable(overriddenRows);

    return output;
  }

  private formatTable(rows: string[][]): string {
    if (rows.length <= 1) return "No overridden variables found.";

    // Set fixed column widths
    const columnWidths = [42, 18, 80]; // Name, Source, Value. No Overridden column.

    const separator = columnWidths
      .map((width) => "-".repeat(width))
      .join("-+-");

    let result = "";
    for (let i = 0; i < rows.length; i++) {
      if (i === 1) result += separator + "\n";

      const row = rows[i];

      if (i === 0) {
        // Header row - format normally without wrapping
        const formattedRow = row.map((cell, colIndex) =>
          cell.padEnd(columnWidths[colIndex])
        );
        result += formattedRow.join(" | ") + "\n";
      } else {
        // Data rows - check if any column needs text wrapping
        const needsWrapping = row.some(
          (cell, colIndex) => cell.length > columnWidths[colIndex]
        );

        if (needsWrapping) {
          // Handle text wrapping by creating multiple rows
          const wrappedRows = this.createWrappedRows(row, columnWidths);
          for (const wrappedRow of wrappedRows) {
            // Format each wrapped row with exact column widths
            const formattedRow = wrappedRow.map((cell, colIndex) =>
              cell.padEnd(columnWidths[colIndex])
            );
            result += formattedRow.join(" | ") + "\n";
          }
        } else {
          // Single row - format normally
          const formattedRow = row.map((cell, colIndex) =>
            cell.padEnd(columnWidths[colIndex])
          );
          result += formattedRow.join(" | ") + "\n";
        }
      }
    }

    return result.trim();
  }

  private createWrappedRows(row: string[], columnWidths: number[]): string[][] {
    const wrappedRows: string[][] = [];

    // Wrap each column that needs it
    const wrappedColumns = row.map((cell, colIndex) => {
      if (cell.length > columnWidths[colIndex]) {
        return this.wrapTextToLines(cell, columnWidths[colIndex]);
      }
      return [cell];
    });

    // Find the maximum number of lines needed
    const maxLines = Math.max(...wrappedColumns.map((col) => col.length));

    // Create rows for each line
    for (let lineIndex = 0; lineIndex < maxLines; lineIndex++) {
      const wrappedRow = wrappedColumns.map((col, colIndex) => {
        if (lineIndex < col.length) {
          return col[lineIndex];
        } else {
          // Empty space for columns that don't need this many lines
          return " ".repeat(columnWidths[colIndex]);
        }
      });
      wrappedRows.push(wrappedRow);
    }

    return wrappedRows;
  }

  private wrapTextToLines(text: string, maxWidth: number): string[] {
    if (text.length <= maxWidth) {
      return [text];
    }

    const lines: string[] = [];
    const words = text.split(" ");
    let currentLine = "";

    for (const word of words) {
      // If adding this word would exceed the line width
      if (currentLine.length + word.length + 1 > maxWidth) {
        if (currentLine.length > 0) {
          // Start a new line
          lines.push(currentLine);
          currentLine = word;
        } else {
          // Word itself is longer than maxWidth, break it into multiple lines
          let remainingWord = word;
          while (remainingWord.length > 0) {
            const lineContent = remainingWord.substring(0, maxWidth);
            lines.push(lineContent);
            remainingWord = remainingWord.substring(maxWidth);
          }
          currentLine = "";
        }
      } else {
        // Add word to current line
        if (currentLine.length > 0) {
          currentLine += " " + word;
        } else {
          currentLine = word;
        }
      }
    }

    // Add the last line
    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    return lines;
  }

  private sanitize(value: string): string {
    if (!value) return "";

    // Truncate long values for display
    if (value.length <= 50) return value;
    return value.substring(0, 47) + "...";
  }

  print(data: DebugData, envName?: string): void {
    /* v8 ignore start: terminal rendering -- @preserve */
    this.logger.info("\n");
    this.logger.info("Environment Variables Debug Information:");
    this.logger.info("========================================");
    this.logger.info("\n");
    console.log(this.renderTable(data, envName));
    /* v8 ignore stop -- @preserve */
  }
}
