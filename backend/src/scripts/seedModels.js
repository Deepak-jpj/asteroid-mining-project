import { saveModel } from "../services/modelRegistry.js";

const baseModel = {
  classes: ["C", "S", "M"],
  centroids: {
    C: [0.25, 0.2, 0.08, 0.82, 0.25, 0.35],
    S: [0.35, 0.25, 0.35, 0.25, 0.62, 0.5],
    M: [0.2, 0.18, 0.2, 0.2, 0.45, 0.72]
  }
};

saveModel("rf.json", baseModel);
saveModel("gb.json", {
  ...baseModel,
  centroids: {
    C: [0.23, 0.19, 0.07, 0.84, 0.2, 0.33],
    S: [0.38, 0.3, 0.37, 0.21, 0.64, 0.49],
    M: [0.18, 0.14, 0.22, 0.16, 0.43, 0.75]
  }
});
saveModel("svm.json", {
  ...baseModel,
  centroids: {
    C: [0.27, 0.23, 0.1, 0.78, 0.22, 0.38],
    S: [0.36, 0.26, 0.34, 0.3, 0.66, 0.52],
    M: [0.21, 0.15, 0.18, 0.25, 0.4, 0.7]
  }
});

console.log("Model seeds written to backend/models");
