import { marked } from 'marked';

/** เนื้อหาเขียนเองทั้งหมด (ไม่ใช่ input จากผู้ใช้) จึง render เป็น HTML ได้ตรงๆ */
export const md = (text: string): string => marked.parse(text, { async: false });
export const mdInline = (text: string): string => marked.parseInline(text, { async: false });
