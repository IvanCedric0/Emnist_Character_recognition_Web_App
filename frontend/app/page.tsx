"use client";

import {
  useState,
  useRef,
  useEffect,
  ChangeEvent,
  FormEvent,
  MouseEvent,
  TouchEvent,
} from "react";

type PredictionResponse = {
  prediction_index: number;
  prediction_char: string;
  error?: string;
};

type InputMode = "upload" | "draw";

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>("upload");
  const [hasDrawing, setHasDrawing] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  // Initialize canvas background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#000000"; // 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#ffffff"; 
    ctx.lineWidth = 28;
    ctx.lineCap = "round";
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setPrediction(null);
    setError(null);

    if (f) {
      const url = URL.createObjectURL(f);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const getCanvasContext = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    return ctx;
  };

  const getCanvasPos = (
    e: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ("touches" in e && e.touches.length > 0) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else if ("clientX" in e) {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
    return { x: 0, y: 0 };
  };

  const startDrawing = (
    e: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>
  ) => {
    const ctx = getCanvasContext();
    if (!ctx) return;
    e.preventDefault();
    const { x, y } = getCanvasPos(e);
    isDrawingRef.current = true;
    lastPosRef.current = { x, y };
    setHasDrawing(true);
  };

  const draw = (
    e: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>
  ) => {
    const ctx = getCanvasContext();
    if (!ctx || !isDrawingRef.current) return;
    e.preventDefault();

    const { x, y } = getCanvasPos(e);
    const lastPos = lastPosRef.current;
    if (!lastPos) {
      lastPosRef.current = { x, y };
      return;
    }

    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    lastPosRef.current = { x, y };
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
    lastPosRef.current = null;
  };

  const clearDrawing = () => {
    const canvas = canvasRef.current;
    const ctx = getCanvasContext();
    if (!canvas || !ctx) return;
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 28;
    ctx.lineCap = "round";
    setHasDrawing(false);
    setPrediction(null);
    setError(null);
    // For preview, we can also clear
    setPreviewUrl(null);
  };

  const canvasToBlob = (): Promise<Blob | null> =>
    new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) return resolve(null);
      canvas.toBlob((blob) => {
        resolve(blob);
      }, "image/png");
    });

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (inputMode === "upload" && !file) {
      setError("Please select an image first.");
      return;
    }

    if (inputMode === "draw" && !hasDrawing) {
      setError("Please draw a character first.");
      return;
    }

    setLoading(true);
    setError(null);
    setPrediction(null);

    const formData = new FormData();

    try {
      if (inputMode === "upload") {
        if (!file) throw new Error("No file selected");
        formData.append("file", file);
      } else {
        const blob = await canvasToBlob();
        if (!blob) {
          throw new Error("Could not read drawing from canvas.");
        }
        formData.append("file", blob, "drawing.png");
      }

      const res = await fetch("http://127.0.0.1:5000/predict", {
        method: "POST",
        body: formData,
      });

      const raw = await res.json();

      if (!res.ok || (raw as { error?: string }).error) {
        const err = raw as { error?: string };
        setError(err.error ?? "Server error");
      } else {
        const data = raw as PredictionResponse;
        setPrediction(data);

        if (inputMode === "draw") {
          // Update preview from canvas in draw mode
          const canvas = canvasRef.current;
          if (canvas) {
            setPreviewUrl(canvas.toDataURL("image/png"));
          }
        }
      }
    } catch (err) {
      console.error(err);
      setError("Could not reach backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-linear-to-br from-slate-900 via-slate-950 to-slate-900 text-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            I&L Handwritten Character Recognition
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-300 max-w-xl mx-auto">
            Use the EMNIST-trained neural network to recognize handwritten
            digits and letters. You can either upload an image or draw directly
            on the canvas.
          </p>
        </header>

        {/* Main card */}
        <div className="bg-slate-900/70 border border-slate-700/70 rounded-2xl shadow-xl shadow-slate-950/40 p-6 sm:p-8 grid gap-6 sm:gap-8 md:grid-cols-[1.2fr,1fr]">
          {/* Left: input mode + form */}
          <section>
            <h2 className="text-lg font-medium mb-3 flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-500/10 text-sky-400 text-xs font-semibold">
                1
              </span>
              Choose input mode
            </h2>

            {/* Mode toggle */}
            <div className="inline-flex mb-4 rounded-full border border-slate-700 bg-slate-900/70 text-sm overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  setInputMode("upload");
                  setError(null);
                }}
                className={`px-4 py-1.5 ${
                  inputMode === "upload"
                    ? "bg-sky-500 text-slate-950"
                    : "text-slate-300 hover:bg-slate-800/60"
                }`}
              >
                Upload
              </button>
              <button
                type="button"
                onClick={() => {
                  setInputMode("draw");
                  setError(null);
                }}
                className={`px-4 py-1.5 ${
                  inputMode === "draw"
                    ? "bg-sky-500 text-slate-950"
                    : "text-slate-300 hover:bg-slate-800/60"
                }`}
              >
                Draw
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {inputMode === "upload" ? (
                <>
                  <h3 className="text-sm font-medium text-slate-200 mb-1">
                    Upload an image
                  </h3>
                  <label
                    htmlFor="file"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-600 rounded-xl cursor-pointer bg-slate-900/60 hover:border-sky-500 hover:bg-slate-900/80 transition-colors text-sm text-slate-300"
                  >
                    <span className="mb-1 font-medium">
                      Click to upload or drag &amp; drop
                    </span>
                    <span className="text-xs text-slate-400">
                      PNG / JPG, 28×28 or similar
                    </span>
                    <input
                      id="file"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  <div className="text-xs text-slate-400 truncate">
                    {file ? (
                      <>
                        <span className="font-medium text-slate-200">
                          Selected:
                        </span>{" "}
                        {file.name}
                      </>
                    ) : (
                      "No file selected yet"
                    )}
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-sm font-medium text-slate-200 mb-1">
                    Draw a character
                  </h3>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">
                        Draw a single, centered character.
                      </span>
                      <button
                        type="button"
                        onClick={clearDrawing}
                        className="text-xs px-3 py-1 rounded-full border border-slate-600 text-slate-200 hover:bg-slate-800/80 transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="rounded-xl border border-slate-700/70 bg-slate-900/80 flex items-center justify-center">
                      <canvas
                        ref={canvasRef}
                        width={280}
                        height={280}
                        className="bg-white rounded-lg cursor-crosshair touch-none"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        onTouchCancel={stopDrawing}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading || (inputMode === "upload" && !file) ||  (inputMode === "draw" && !hasDrawing)}
                  className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    loading ||
                    (inputMode === "upload" && !file) ||
                    (inputMode === "draw" && !hasDrawing)
                      ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                      : "bg-sky-500 hover:bg-sky-400 text-slate-950"
                  }`}
                >
                  {loading ? (
                    <>
                      <span className="h-3 w-3 mr-2 rounded-full border-2 border-slate-900 border-t-transparent animate-spin" />
                      Predicting…
                    </>
                  ) : (
                    "Predict"
                  )}
                </button>
              </div>
            </form>

            {/* Error message */}
            {error && (
              <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                <span className="font-semibold">Error:</span> {error}
              </div>
            )}

            {/* Info note */}
            <p className="mt-4 text-xs text-slate-400 leading-relaxed">
              Tip: For best results, draw or upload a high-contrast character
              similar to the EMNIST dataset (one character per image, well
              centered).
            </p>
          </section>

          {/* Right: preview + prediction */}
          <section className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-medium mb-3 flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
                  2
                </span>
                Preview
              </h2>

              <div className="flex items-center justify-center rounded-xl border border-slate-700/70 bg-slate-900/70 min-h-[140px]">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="preview"
                    className="w-32 h-32 object-contain bg-slate-950 rounded-lg border border-slate-800"
                  />
                ) : inputMode === "draw" ? (
                  <p className="text-sm text-slate-500">
                    Draw a character in the canvas to preview it here.
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">
                    No image selected yet.
                  </p>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-medium mb-3 flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/10 text-violet-400 text-xs font-semibold">
                  3
                </span>
                Prediction
              </h2>

              <div className="rounded-xl border border-slate-700/70 bg-slate-900/70 px-4 py-3 text-sm">
                {loading && (
                  <p className="text-slate-300">
                    Analyzing the image with the neural network…
                  </p>
                )}

                {!loading && prediction && (
                  <div className="space-y-1">
                    <p className="text-slate-300">
                      <span className="font-semibold text-slate-100">
                        Predicted character:
                      </span>{" "}
                      <span className="inline-flex items-center justify-center rounded-md bg-slate-100 text-slate-900 text-lg font-bold px-2 py-1 ml-1">
                        {prediction.prediction_char}
                      </span>
                    </p>
                    <p className="text-xs text-slate-500">
                      Class index: {prediction.prediction_index}
                    </p>
                  </div>
                )}

                {!loading && !prediction && !error && (
                  <p className="text-slate-500 text-sm">
                    Provide an input and click{" "}
                    <span className="font-medium">Predict</span> to see the
                    model’s output.
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="mt-6 text-center text-xs text-slate-500">
          Built with a custom neural network trained on EMNIST ByClass by Ivan and Lenny
          (digits + uppercase + lowercase letters).
        </footer>
      </div>
    </main>
  );
}
