## Draftly – Nepali Handwritten Text Digitization

Draftly is a web-based application that converts handwritten Nepali (Devanagari) documents into editable digital text using a segmentation-based deep learning approach. The system is designed to reduce the time, cost, and errors associated with manual transcription of handwritten documents.

Unlike traditional OCR systems, Draftly uses a **divide-and-conquer strategy** by segmenting each handwritten word into three structural zones: upper modifiers, main characters, and lower modifiers. Each zone is processed by a specialized Convolutional Neural Network (CNN), and the predictions are recombined using Unicode reconstruction to generate accurate digital text.

### Key Features
- Upload or scan handwritten Nepali documents
- Zone-based character segmentation (upper, middle, lower)
- Multi-model CNN architecture (7 specialized classifiers)
- Unicode-based text reconstruction
- Editable output with real-time correction
- Scratchboard feature for correcting misclassified characters

### Tech Stack
- **Frontend:** HTML, CSS, JavaScript  
- **Backend:** Flask (Python)  
- **ML/DL:** TensorFlow/Keras, OpenCV  
- **Tools:** Google Colab, VS Code, GitHub  

### Highlights
- Handles complex Devanagari structures (modifiers, conjuncts, diacritics)
- Improves accuracy through segmentation-first pipeline
- Reduces dependency on manual typing services
- Provides an interpretable and modular OCR pipeline

### Motivation
Manual conversion of handwritten Nepali text is slow, error-prone, and inefficient. Draftly addresses this problem by providing an automated and accessible solution for digitizing handwritten documents, especially for under-resourced scripts like Devanagari.

### Images
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/e50f4eb0-53dc-428e-8c56-8da36e61b2d6" />

<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/2efa5505-fa3f-4159-8dc9-55a3f8f121c3" />


---

> Developed as a final year project focused on applying deep learning for real-world document digitization.
