import { Config } from 'encore.dev/config';

export const config = new Config({
  llm: {
    chatModel: new Config.String({
      description: "The default model to use for chat-based generation.",
      default: 'anthropic/claude-3.5-sonnet',
    }),
    embeddingModel: new Config.String({
      description: "The model to use for generating text embeddings.",
      default: 'sentence-transformers/all-minilm-l6-v2',
    }),
    baseUrl: new Config.String({
      description: "The base URL for the OpenRouter API.",
      default: 'https://openrouter.ai/api/v1',
    }),
  },
  vectorStore: {
    dimensions: new Config.Int({
      description: "The number of dimensions for the vector embeddings.",
      default: 384,
    }),
    maxElements: new Config.Int({
      description: "The maximum number of elements to store in the vector index.",
      default: 10000,
    }),
    indexPath: new Config.String({
        description: "Path to the vector index file, relative to the organism_sandbox.",
        default: "vector_index.bin",
    }),
    mapPath: new Config.String({
        description: "Path to the vector index ID map file, relative to the organism_sandbox.",
        default: "vector_index_map.json",
    }),
  },
  sandbox: {
    path: new Config.String({
      description: "The name of the sandbox directory where organisms can perform file operations.",
      default: 'organism_sandbox',
    }),
  },
});
