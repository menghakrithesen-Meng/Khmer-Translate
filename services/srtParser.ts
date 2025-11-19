import { SrtBlock } from '../types';

/**
 * Parses a raw SRT string into an array of SrtBlock objects.
 */
export const parseSrt = (srtContent: string): SrtBlock[] => {
  const normalizeLineEndings = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalizeLineEndings.trim().split(/\n\n+/);

  const parsedBlocks: SrtBlock[] = [];

  blocks.forEach((block) => {
    const lines = block.split('\n');
    if (lines.length >= 3) {
      const id = parseInt(lines[0].trim(), 10);
      const timecodeLine = lines[1].trim();
      
      // Extract text (lines 2 onwards)
      const text = lines.slice(2).join('\n').trim();

      // Parse timecodes "00:00:01,000 --> 00:00:04,000"
      const timeMatch = timecodeLine.match(/(\d{2}:\d{2}:\d{2},\d{3})\s-->\s(\d{2}:\d{2}:\d{2},\d{3})/);

      if (!isNaN(id) && timeMatch) {
        parsedBlocks.push({
          id,
          startTime: timeMatch[1],
          endTime: timeMatch[2],
          text,
          originalText: text
        });
      }
    }
  });

  return parsedBlocks;
};

/**
 * Converts an array of SrtBlock objects back into a standard SRT string.
 */
export const stringifySrt = (blocks: SrtBlock[]): string => {
  return blocks.map(block => {
    return `${block.id}\n${block.startTime} --> ${block.endTime}\n${block.text}`;
  }).join('\n\n');
};

/**
 * Groups blocks into chunks of a specified size.
 */
export const chunkArray = <T,>(array: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};
