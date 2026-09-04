"use client";

import { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from "react";
import { useEditor, EditorContent, Extension, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { TransliterationExtension } from "./TransliterationExtension";
import Scratchpad from "./Scratchpad";

export interface EditableResultRef {
  exportPdf: () => Promise<void>;
}

interface HoldTarget {
  from: number;
  to: number;
  char: string;
}

interface EditableResultProps {
  text: string;
  onChange: (newText: string) => void;
  onExportingChange?: (isExporting: boolean) => void;
}

const GraphemeHoldPluginKey = new PluginKey("graphemeHold");

const EditableResult = forwardRef<EditableResultRef, EditableResultProps>(function EditableResult(
  { text, onChange, onExportingChange },
  ref
) {
  const [holdingTarget, setHoldingTarget] = useState<HoldTarget | null>(null);
  const [isScratchpadOpen, setIsScratchpadOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const isInternalUpdateRef = useRef(false);
  const holdingTargetRef = useRef<HoldTarget | null>(null);
  holdingTargetRef.current = holdingTarget;

  // Custom Extension for 500ms Hold-to-Select per grapheme in Tiptap/ProseMirror
  const GraphemeHoldExtension = Extension.create({
    name: "graphemeHold",

    addProseMirrorPlugins() {
      let timer: NodeJS.Timeout | null = null;
      let startCoords: { x: number; y: number } | null = null;

      return [
        new Plugin({
          key: GraphemeHoldPluginKey,

          state: {
            init() {
              return { activeTarget: null, decorationSet: DecorationSet.empty };
            },
            apply(tr, value, oldState, newState) {
              const meta = tr.getMeta(GraphemeHoldPluginKey);
              if (meta !== undefined) {
                if (meta && meta.activeTarget) {
                  const { from, to } = meta.activeTarget;
                  const deco = Decoration.inline(from, to, {
                    class:
                      "bg-blue-200/90 text-blue-950 font-bold border-b-2 border-blue-600 rounded-sm px-0.5 shadow-sm transition-all",
                  });
                  return {
                    activeTarget: meta.activeTarget,
                    decorationSet: DecorationSet.create(newState.doc, [deco]),
                  };
                } else {
                  return { activeTarget: null, decorationSet: DecorationSet.empty };
                }
              }
              return {
                activeTarget: value.activeTarget,
                decorationSet: value.decorationSet.map(tr.mapping, tr.doc),
              };
            },
          },

          props: {
            decorations(state) {
              return this.getState(state)?.decorationSet;
            },

            handleDOMEvents: {
              pointerdown(view, event) {
                if (event.button !== 0 && event.pointerType === "mouse") return false;
                startCoords = { x: event.clientX, y: event.clientY };

                const posResult = view.posAtCoords({ left: event.clientX, top: event.clientY });
                if (!posResult) return false;

                const { pos } = posResult;
                const $pos = view.state.doc.resolve(pos);
                const parent = $pos.parent;
                const parentOffset = $pos.parentOffset;

                // Locate matching text child inside parent node
                let textNode: any = null;
                let offsetInParent = 0;

                for (let i = 0; i < parent.childCount; i++) {
                  const child = parent.child(i);
                  const childSize = child.nodeSize;
                  if (offsetInParent <= parentOffset && parentOffset <= offsetInParent + childSize) {
                    if (child.isText) {
                      textNode = child;
                      break;
                    }
                  }
                  offsetInParent += childSize;
                }

                if (!textNode || !textNode.text) return false;

                const nodeStart = $pos.start() + offsetInParent;
                const relativeOffset = Math.max(0, Math.min(pos - nodeStart, textNode.text.length - 1));
                const textStr = textNode.text;

                // Segment using Intl.Segmenter for exact Devanagari grapheme cluster boundaries
                let graphemes: { segment: string; index: number }[] = [];
                try {
                  const segmenter = new Intl.Segmenter("ne", { granularity: "grapheme" });
                  graphemes = Array.from(segmenter.segment(textStr));
                } catch (e) {
                  graphemes = textStr.split("").map((c: string, idx: number) => ({ segment: c, index: idx }));
                }

                let target: { segment: string; index: number; length: number } | null = null;
                for (let i = 0; i < graphemes.length; i++) {
                  const seg = graphemes[i];
                  const segLength = seg.segment.length;
                  if (relativeOffset >= seg.index && relativeOffset < seg.index + segLength) {
                    target = { ...seg, length: segLength };
                    break;
                  }
                }

                if (!target && graphemes.length > 0) {
                  const lastSeg = graphemes[graphemes.length - 1];
                  target = { ...lastSeg, length: lastSeg.segment.length };
                }

                if (target) {
                  const from = nodeStart + target.index;
                  const to = from + target.length;
                  const char = target.segment;

                  if (timer) clearTimeout(timer);
                  timer = setTimeout(() => {
                    // Apply visual highlight decoration to the single grapheme
                    view.dispatch(
                      view.state.tr.setMeta(GraphemeHoldPluginKey, {
                        activeTarget: { from, to, char },
                      })
                    );
                    setHoldingTarget({ from, to, char });
                    setIsScratchpadOpen(true);
                  }, 500);
                }

                return false;
              },

              pointermove(view, event) {
                if (startCoords && timer) {
                  const dx = Math.abs(event.clientX - startCoords.x);
                  const dy = Math.abs(event.clientY - startCoords.y);
                  if (dx > 8 || dy > 8) {
                    clearTimeout(timer);
                    timer = null;
                    startCoords = null;
                  }
                }
                return false;
              },

              pointerup(view, event) {
                if (timer) {
                  clearTimeout(timer);
                  timer = null;
                }
                startCoords = null;
                return false;
              },

              pointerleave(view, event) {
                if (timer) {
                  clearTimeout(timer);
                  timer = null;
                }
                startCoords = null;
                return false;
              },
            },
          },
        }),
      ];
    },
  });

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right", "justify"],
        defaultAlignment: "left",
      }),
      GraphemeHoldExtension,
      TransliterationExtension,
    ],
    content: text || "",
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        class:
          "font-devanagari text-2xl md:text-3xl leading-relaxed outline-none min-h-[180px] text-slate-900 focus:outline-none",
      },
    },
    onUpdate({ editor }) {
      isInternalUpdateRef.current = true;
      onChange(editor.getText({ blockSeparator: "\n" }));
    },
  });

  // Track reactive formatting and selection states using useEditorState
  const editorState = useEditorState({
    editor,
    selector: (ctx) => {
      if (!ctx.editor) {
        return {
          isBold: false,
          isItalic: false,
          isBulletList: false,
          isOrderedList: false,
          textAlign: "left",
        };
      }
      return {
        isBold: ctx.editor.isActive("bold"),
        isItalic: ctx.editor.isActive("italic"),
        isBulletList: ctx.editor.isActive("bulletList"),
        isOrderedList: ctx.editor.isActive("orderedList"),
        textAlign: ctx.editor.isActive({ textAlign: "center" })
          ? "center"
          : ctx.editor.isActive({ textAlign: "right" })
          ? "right"
          : ctx.editor.isActive({ textAlign: "justify" })
          ? "justify"
          : "left",
      };
    },
  });

  const isBold = editorState?.isBold ?? (editor ? editor.isActive("bold") : false);
  const isItalic = editorState?.isItalic ?? (editor ? editor.isActive("italic") : false);
  const isBulletList = editorState?.isBulletList ?? (editor ? editor.isActive("bulletList") : false);
  const isOrderedList = editorState?.isOrderedList ?? (editor ? editor.isActive("orderedList") : false);
  const currentAlign = editorState?.textAlign ?? "left";

  // Sync external text prop (e.g. fresh OCR prediction) into Tiptap doc
  useEffect(() => {
    if (!editor || text === undefined) return;
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }
    const currentText = editor.getText({ blockSeparator: "\n" });
    if (currentText !== text && text !== "") {
      editor.commands.setContent(text);
    }
  }, [text, editor]);

  // Export editor content to PDF with complete formatting and Devanagari font support
  const handleExportPdf = useCallback(async () => {
    if (!editor) return;
    setIsExporting(true);
    onExportingChange?.(true);

    try {
      const html2pdfModule = await import("html2pdf.js");
      const html2pdf = html2pdfModule.default;

      // Create a print container with standard A4 dimensions
      const container = document.createElement("div");
      container.id = "draftly-print-area";
      container.style.position = "fixed";
      container.style.left = "-9999px";
      container.style.top = "0";
      container.style.width = "794px"; // A4 width at 96 DPI
      container.style.backgroundColor = "#ffffff";
      container.style.color = "#0f172a";
      container.style.fontFamily = "'Noto Sans Devanagari', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      container.style.padding = "48px";
      container.style.boxSizing = "border-box";

      const editorHtml = editor.getHTML();

      container.innerHTML = `
        <div style="border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 28px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.03em;">Draftly</span>
              <span style="font-size: 11px; background: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 4px; font-family: sans-serif; font-weight: 600;">Devanagari Document</span>
            </div>
            <p style="margin: 6px 0 0 0; font-size: 12px; color: #64748b; font-family: sans-serif;">Devanagari Handwritten to Digital Recognized Text</p>
          </div>
          <div style="text-align: right; font-size: 11px; color: #94a3b8; font-family: sans-serif;">
            ${new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
          </div>
        </div>
        <div class="draftly-export-content" style="font-size: 18px; line-height: 2; color: #1e293b;">
          ${editorHtml}
        </div>
        <style>
          .draftly-export-content p { margin-top: 0.5rem; margin-bottom: 0.5rem; }
          .draftly-export-content ul { list-style-type: disc !important; margin-left: 2rem !important; padding-left: 0.25rem !important; margin-top: 0.75rem !important; margin-bottom: 0.75rem !important; }
          .draftly-export-content ol { list-style-type: decimal !important; margin-left: 2rem !important; padding-left: 0.25rem !important; margin-top: 0.75rem !important; margin-bottom: 0.75rem !important; }
          .draftly-export-content li { display: list-item !important; margin-top: 0.35rem !important; margin-bottom: 0.35rem !important; }
          .draftly-export-content li p { display: inline !important; margin: 0 !important; }
          .draftly-export-content strong, .draftly-export-content b { font-weight: 700 !important; color: #0f172a !important; }
          .draftly-export-content em, .draftly-export-content i { font-style: italic !important; }
        </style>
      `;

      document.body.appendChild(container);

      const opt = {
        margin: [12, 12, 12, 12] as [number, number, number, number],
        filename: `Draftly_Export_${new Date().toISOString().slice(0, 10)}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          logging: false,
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
      };

      await html2pdf().set(opt).from(container).save();
      document.body.removeChild(container);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2500);
    } catch (err) {
      console.error("PDF generation failed, falling back to print:", err);
      window.print();
    } finally {
      setIsExporting(false);
      onExportingChange?.(false);
    }
  }, [editor, onExportingChange]);

  useImperativeHandle(
    ref,
    () => ({
      exportPdf: handleExportPdf,
    }),
    [handleExportPdf]
  );

  const handleScratchpadSubmit = (newChar: string) => {
    if (editor && holdingTarget) {
      editor
        .chain()
        .focus()
        .insertContentAt({ from: holdingTarget.from, to: holdingTarget.to }, newChar)
        .run();

      // Remove character highlight decoration
      editor.view.dispatch(
        editor.view.state.tr.setMeta(GraphemeHoldPluginKey, { activeTarget: null })
      );
    }
    setHoldingTarget(null);
    setIsScratchpadOpen(false);
  };

  const handleScratchpadClose = () => {
    if (editor) {
      // Remove character highlight decoration
      editor.view.dispatch(
        editor.view.state.tr.setMeta(GraphemeHoldPluginKey, { activeTarget: null })
      );
    }
    setHoldingTarget(null);
    setIsScratchpadOpen(false);
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Rich Text Editing Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border border-slate-200 bg-slate-50/90 p-1.5 rounded-md text-slate-700 select-none">
        <div className="flex flex-wrap items-center gap-1">
          {/* Bold Button */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1 ${
              isBold
                ? "bg-slate-900 text-white shadow-sm"
                : "hover:bg-slate-200 text-slate-700 hover:text-slate-900"
            }`}
            title="Bold (Ctrl+B)"
            aria-label="Bold"
          >
            <span className="font-bold text-sm leading-none">B</span>
          </button>

          {/* Italic Button */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1 ${
              isItalic
                ? "bg-slate-900 text-white shadow-sm"
                : "hover:bg-slate-200 text-slate-700 hover:text-slate-900"
            }`}
            title="Italic (Ctrl+I)"
            aria-label="Italic"
          >
            <span className="italic font-serif text-sm leading-none">I</span>
          </button>

          <div className="h-4 w-px bg-slate-300 mx-1" />

          {/* Bullet List Button */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${
              isBulletList
                ? "bg-slate-900 text-white shadow-sm"
                : "hover:bg-slate-200 text-slate-700 hover:text-slate-900"
            }`}
            title="Bullet List"
            aria-label="Bullet List"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />
            </svg>
            <span className="hidden sm:inline">Bullet List</span>
          </button>

          {/* Numbered List Button */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${
              isOrderedList
                ? "bg-slate-900 text-white shadow-sm"
                : "hover:bg-slate-200 text-slate-700 hover:text-slate-900"
            }`}
            title="Numbered List"
            aria-label="Numbered List"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6h10M10 12h10M10 18h10M4 6h1v4m-1 0h2m-2 4h2v2H4v2h2" />
            </svg>
            <span className="hidden sm:inline">Numbered List</span>
          </button>

          <div className="h-4 w-px bg-slate-300 mx-1" />

          {/* Text Alignment Controls */}
          <div className="flex items-center gap-0.5 bg-slate-200/70 p-0.5 rounded">
            {/* Left Align */}
            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
              className={`p-1.5 rounded transition-all ${
                currentAlign === "left"
                  ? "bg-white text-slate-900 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
              }`}
              title="Align Left"
              aria-label="Align Left"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h14" />
              </svg>
            </button>

            {/* Center Align */}
            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign("center").run()}
              className={`p-1.5 rounded transition-all ${
                currentAlign === "center"
                  ? "bg-white text-slate-900 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
              }`}
              title="Align Center"
              aria-label="Align Center"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M5 18h14" />
              </svg>
            </button>

            {/* Right Align */}
            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
              className={`p-1.5 rounded transition-all ${
                currentAlign === "right"
                  ? "bg-white text-slate-900 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
              }`}
              title="Align Right"
              aria-label="Align Right"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 12h10M6 18h14" />
              </svg>
            </button>

            {/* Justify Align */}
            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign("justify").run()}
              className={`p-1.5 rounded transition-all ${
                currentAlign === "justify"
                  ? "bg-white text-slate-900 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
              }`}
              title="Justify"
              aria-label="Justify"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Right Section: Export PDF */}
        <div className="flex items-center gap-1.5">
          {/* <button */}
          {/*   type="button" */}
          {/*   onClick={handleExportPdf} */}
          {/*   disabled={isExporting} */}
          {/*   className={`px-2.5 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 border ${ */}
          {/*     exportSuccess */}
          {/*       ? "bg-emerald-50 text-emerald-700 border-emerald-300" */}
          {/*       : isExporting */}
          {/*       ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" */}
          {/*       : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100 hover:text-slate-900 shadow-xs" */}
          {/*   }`} */}
          {/*   title="Export editor content as PDF" */}
          {/*   aria-label="Export PDF" */}
          {/* > */}
          {/*   {isExporting ? ( */}
          {/*     <> */}
          {/*       <svg className="animate-spin w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24"> */}
          {/*         <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /> */}
          {/*         <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /> */}
          {/*       </svg> */}
          {/*       <span>Exporting...</span> */}
          {/*     </> */}
          {/*   ) : exportSuccess ? ( */}
          {/*     <> */}
          {/*       <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"> */}
          {/*         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /> */}
          {/*       </svg> */}
          {/*       <span className="font-semibold text-emerald-700">Downloaded!</span> */}
          {/*     </> */}
          {/*   ) : ( */}
          {/*     <> */}
          {/*       <svg className="w-3.5 h-3.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"> */}
          {/*         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> */}
          {/*       </svg> */}
          {/*       <span className="font-medium">Export PDF</span> */}
          {/*     </> */}
          {/*   )} */}
          {/* </button> */}
        </div>
      </div>

      {/* Tiptap Rich Text Editor Body */}
      <div className="border border-slate-200 rounded-md bg-white p-4 min-h-[220px]">
        <EditorContent editor={editor} />
      </div>

      {/* Scratchpad Character Correction Tool */}
      {isScratchpadOpen && (
        <Scratchpad
          currentChar={holdingTarget?.char}
          onClose={handleScratchpadClose}
          onSubmit={handleScratchpadSubmit}
        />
      )}
    </div>
  );
});

export default EditableResult;

