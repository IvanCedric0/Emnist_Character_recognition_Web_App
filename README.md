# 🧠 EMNIST Handwritten Character Recognition (AI Project #1)

This project is a full AI pipeline that recognizes handwritten characters using a neural network trained from scratch on the **EMNIST ByClass dataset**.

It includes:

- ✔️ A **Python backend (Flask)** for loading the trained model and predicting characters  
- ✔️ A **Next.js + TypeScript frontend** where users can  
  - upload images  
  - draw characters on a canvas  
  - receive predictions instantly  
- ✔️ A custom-built **ANN (1 hidden layer, trained from scratch with NumPy)**  
- ✔️ Support for **62-character prediction** (digits, uppercase, lowercase)

---

## 📂 Project Structure

AI-PROJECT-1/
│
├── backend_byclass/ # Main backend
│ ├── app.py # Flask server
│ └── emnist_byclass_ANN_128hs_subset.npz # Saved trained model
│
├── frontend/ # Next.js + Tailwind UI
│ ├── app/ # App router pages & components
│ ├── public/ # Static files
│ ├── package.json
│ ├── tsconfig.json
│ └── next.config.ts
│
├
│
├── .gitignore # Python + Node + Dataset ignores
└── README.md 

---

## 🚀 Running the Project

### 1️⃣ Backend (Flask)

Install dependencies:

cd backend_byclass
pip install flask flask-cors pillow numpy
Run the backend:

python app.py
The server starts at:

http://127.0.0.1:5000

### 2️⃣ Frontend (Next.js + Typescript)
Install dependencies:

cd frontend
npm install
Start development server:

npm run dev
Runs at:

http://localhost:3000

## 📝 Model

Dataset: EMNIST ByClass (214k images)

Input: 28×28 grayscale images (flattened to 784)

Hidden layer: 128 units

Output: 62 softmax neurons (digits + uppercase + lowercase)

Training: Custom ANN (NumPy only)

Models are saved as:

emnist_byclass_ANN_128hs_subset.npz
Loaded automatically by Flask.

## 🎨 Features

✔️ Upload images (PNG/JPG)

✔️ Draw characters directly on canvas

✔️ Automatic resizing + preprocessing

✔️ Predicts uppercase, lowercase, and digits

✔️ Clean UI using TailwindCSS

✔️ Fully offline model (no external API)

## 💡 Future Improvements

Replace ANN with CNN (PyTorch) for 95%+ accuracy

## 📜 License
MIT License. Free to use, modify, and learn from.