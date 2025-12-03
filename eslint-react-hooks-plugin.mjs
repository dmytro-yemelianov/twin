export default {
  rules: {
    "rules-of-hooks": {
      meta: {
        type: "problem",
        docs: {
          description: "Verify Rules of Hooks constraints",
        },
        schema: [],
      },
      create: () => ({}),
    },
    "exhaustive-deps": {
      meta: {
        type: "problem",
        docs: {
          description: "Check effect dependencies",
        },
        schema: [],
      },
      create: () => ({}),
    },
  },
  configs: {
    recommended: {
      plugins: ["react-hooks"],
      rules: {
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "warn",
      },
    },
  },
}
