import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { toFeatureVector } from "./featureService.js";
import { saveModel } from "./modelRegistry.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TRAINING_PATH = path.resolve(__dirname, "../../data/training/labeled-asteroids.json");

export async function trainAndSaveModels() {
  const dataset = loadTrainingData();
  if (!dataset.length) {
    throw new Error("No labeled training data found in backend/data/training/labeled-asteroids.json");
  }

  const modelNames = ["rf.json", "gb.json", "svm.json"];
  for (const [index, name] of modelNames.entries()) {
    const sampled = bootstrap(dataset, index + 1);
    const model = trainCentroidModel(sampled);
    saveModel(name, model);
  }

  return {
    trainedOn: dataset.length,
    models: modelNames
  };
}

function loadTrainingData() {
  if (!fs.existsSync(TRAINING_PATH)) return [];
  const records = JSON.parse(fs.readFileSync(TRAINING_PATH, "utf8"));
  return records.filter((r) => r.label);
}

function trainCentroidModel(records) {
  const byLabel = new Map();

  for (const rec of records) {
    const label = String(rec.label).toUpperCase();
    if (!byLabel.has(label)) byLabel.set(label, []);
    byLabel.get(label).push(toFeatureVector(rec));
  }

  const classes = Array.from(byLabel.keys());
  const centroids = {};
  for (const [label, vectors] of byLabel.entries()) {
    centroids[label] = average(vectors);
  }

  return { classes, centroids };
}

function average(vectors) {
  if (!vectors.length) return [0, 0, 0, 0, 0, 0];
  const sum = new Array(vectors[0].length).fill(0);
  for (const vec of vectors) {
    for (let i = 0; i < vec.length; i += 1) {
      sum[i] += vec[i];
    }
  }
  return sum.map((v) => v / vectors.length);
}

function bootstrap(records, seed) {
  const output = [];
  for (let i = 0; i < records.length; i += 1) {
    const index = (i * seed + seed) % records.length;
    output.push(records[index]);
  }
  return output;
}
