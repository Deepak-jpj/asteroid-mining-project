import { asteroidStore } from "../storage/asteroidStore.js";
import { loadModels } from "./modelRegistry.js";
import { toFeatureVector } from "./featureService.js";

export function classifyAsteroids(ids) {
  const asteroids = asteroidStore.getByIds(ids);
  const models = loadModels();
  const modelEntries = Object.entries(models);

  return asteroids.map((asteroid) => {
    const vector = toFeatureVector(asteroid);
    const votes = modelEntries.map(([modelName, model]) => ({
      model: modelName.replace(".json", ""),
      prediction: predictFromCentroids(model, vector)
    }));
    const finalClass = majorityVote(votes.map((v) => v.prediction));

    return {
      id: asteroid.id,
      finalClass,
      modelVotes: votes
    };
  });
}

function predictFromCentroids(model, vector) {
  let minDistance = Number.POSITIVE_INFINITY;
  let selectedClass = "C";

  for (const className of model.classes) {
    const centroid = model.centroids[className];
    const distance = euclidean(vector, centroid);
    if (distance < minDistance) {
      minDistance = distance;
      selectedClass = className;
    }
  }

  return selectedClass;
}

function euclidean(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const diff = (a[i] || 0) - (b[i] || 0);
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

function majorityVote(classes) {
  const counts = new Map();
  for (const c of classes) {
    counts.set(c, (counts.get(c) || 0) + 1);
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0][0];
}
