"use client";

import { useState, useEffect, useRef } from "react";
import { useEditor, EditorContent, Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import Scratchpad from "./Scratchpad";

interface HoldTarget {
  from: number;
  to: number;
  char: string;
}

const GraphemeHoldPluginKey = new PluginKey("graphemeHold");

export default function EditableResult({
  text,
  onChange,
}: {
  text: string;
  onChange: (newText: string) => void;
}) {
  const [holdingTarget, setHoldingTarget] = useState<HoldTarget | null>(null);
  const [isScratchpadOpen, setIsScratchpadOpen] = useState(false);
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
    extensions: [StarterKit, GraphemeHoldExtension],
    content: text || "",
    editorProps: {
      attributes: {
        class:
          "prose prose-slate max-w-none font-devanagari text-2xl md:text-3xl leading-relaxed outline-none min-h-[180px] text-slate-900",
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getText());
    },
  });

  // Sync external text prop (e.g. fresh OCR prediction) into Tiptap doc
  useEffect(() => {
    if (editor && text !== undefined) {
      const currentText = editor.getText();
      if (currentText !== text && text !== "") {
        editor.commands.setContent(text);
      }
    }
  }, [text, editor]);

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
      <div className="flex items-center gap-1.5 border border-slate-200 bg-slate-50 p-1.5 rounded-md text-slate-700 select-none">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-3 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1 ${
            editor.isActive("bold")
              ? "bg-slate-900 text-white shadow-sm"
              : "hover:bg-slate-200 text-slate-700"
          }`}
          title="Bold"
        >
          <span className="font-bold">B</span>
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-3 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1 ${
            editor.isActive("italic")
              ? "bg-slate-900 text-white shadow-sm"
              : "hover:bg-slate-200 text-slate-700"
          }`}
          title="Italic"
        >
          <span className="italic font-serif">I</span>
        </button>

        <div className="h-4 w-px bg-slate-300 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
            editor.isActive("bulletList")
              ? "bg-slate-900 text-white shadow-sm"
              : "hover:bg-slate-200 text-slate-700"
          }`}
          title="Bulleted List"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span>Bullet List</span>
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
            editor.isActive("orderedList")
              ? "bg-slate-900 text-white shadow-sm"
              : "hover:bg-slate-200 text-slate-700"
          }`}
          title="Numbered List"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 6h13M7 12h13M7 18h13M3 6h.01M3 12h.01M3 18h.01" />
          </svg>
          <span>Numbered List</span>
        </button>
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
}
