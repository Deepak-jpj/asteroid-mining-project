import { trainAndSaveModels } from "../services/trainingService.js";

async function run() {
  try {
    const output = await trainAndSaveModels();
    console.log("Training complete:", output);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

run();
