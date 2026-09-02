import { Extension } from "@tiptap/react";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { transliterateWord } from "@/lib/nepaliTransliterate";

const TransliterationPluginKey = new PluginKey("transliteration");

interface BufferState {
  buffer: string;
  from: number;
  outputLength: number;
}

export const TransliterationExtension = Extension.create({
  name: "transliteration",

  addProseMirrorPlugins() {
    let state: BufferState | null = null;

    return [
      new Plugin({
        key: TransliterationPluginKey,
        props: {
          handleKeyDown(view, event) {
            const { selection } = view.state;
            if (!selection.empty) {
              state = null;
              return false;
            }
            const pos = selection.from;

            const isLetterKey =
              event.key.length === 1 &&
              /^[a-zA-Z]$/.test(event.key) &&
              !event.ctrlKey &&
              !event.metaKey &&
              !event.altKey;

            if (isLetterKey) {
              const continuing = state !== null && pos === state.from + state.outputLength;
              const newBuffer = continuing ? state!.buffer + event.key : event.key;
              const insertFrom = continuing ? state!.from : pos;
              const deleteTo = continuing ? state!.from + state!.outputLength : pos;

              const newOutput = transliterateWord(newBuffer);

              const tr = view.state.tr.insertText(newOutput, insertFrom, deleteTo);
              const newPos = insertFrom + newOutput.length;
              tr.setSelection(TextSelection.create(tr.doc, newPos));
              view.dispatch(tr);

              state = { buffer: newBuffer, from: insertFrom, outputLength: newOutput.length };
              event.preventDefault();
              return true;
            }

            if (event.key === "Backspace") {
              if (state && state.buffer.length > 0 && pos === state.from + state.outputLength) {
                const newBuffer = state.buffer.slice(0, -1);

                if (newBuffer.length === 0) {
                  const tr = view.state.tr.delete(state.from, state.from + state.outputLength);
                  view.dispatch(tr);
                  state = null;
                  event.preventDefault();
                  return true;
                }

                const newOutput = transliterateWord(newBuffer);
                const tr = view.state.tr.insertText(
                  newOutput,
                  state.from,
                  state.from + state.outputLength
                );
                const newPos = state.from + newOutput.length;
                tr.setSelection(TextSelection.create(tr.doc, newPos));
                view.dispatch(tr);
                state = { buffer: newBuffer, from: state.from, outputLength: newOutput.length };
                event.preventDefault();
                return true;
              }

              // outside an active roman buffer — grapheme-safe delete for
              // combining Devanagari sequences the default backspace would break
              state = null;
              if (pos === 0) return false;

              const $pos = view.state.doc.resolve(pos);
              const textBefore = $pos.parent.textBetween(
                Math.max(0, $pos.parentOffset - 8),
                $pos.parentOffset
              );
              if (!textBefore) return false;

              let segmenter: Intl.Segmenter;
              try {
                segmenter = new Intl.Segmenter("ne", { granularity: "grapheme" });
              } catch {
                return false;
              }
              const segments = Array.from(segmenter.segment(textBefore));
              if (segments.length === 0) return false;
              const lastSeg = segments[segments.length - 1];
              if (lastSeg.segment.length <= 1) return false; // default backspace is fine here

              const tr = view.state.tr.delete(pos - lastSeg.segment.length, pos);
              view.dispatch(tr);
              event.preventDefault();
              return true;
            }

            // any other key (space, enter, arrows, punctuation) ends the current word buffer
            state = null;
            return false;
          },

          handleClick() {
            state = null;
            return false;
          },
        },
      }),
    ];
  },
});
