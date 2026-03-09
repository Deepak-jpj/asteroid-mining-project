import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MODEL_DIR = path.resolve(__dirname, "../../models");

const MODEL_FILES = ["rf.json", "gb.json", "svm.json"];

function fallbackModel() {
  return {
    classes: ["C", "S", "M"],
    centroids: {
      C: [0.2, 0.4, 0.1, 0.8, 0.7, 0.3],
      S: [0.6, 0.5, 0.4, 0.4, 0.3, 0.6],
      M: [0.7, 0.6, 0.3, 0.2, 0.2, 0.9]
    }
  };
}

export function loadModels() {
  const models = {};
  for (const file of MODEL_FILES) {
    const filePath = path.join(MODEL_DIR, file);
    if (!fs.existsSync(filePath)) {
      models[file] = fallbackModel();
      continue;
    }
    models[file] = JSON.parse(fs.readFileSync(filePath, "utf8"));
  }
  return models;
}

export function saveModel(name, data) {
  if (!fs.existsSync(MODEL_DIR)) fs.mkdirSync(MODEL_DIR, { recursive: true });
  fs.writeFileSync(path.join(MODEL_DIR, name), JSON.stringify(data, null, 2));
}
