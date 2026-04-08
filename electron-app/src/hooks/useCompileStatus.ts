import { useState } from "react";

export type CompileStatus = "idle" | "compiling" | "error" | "done";

export const useCompileStatus = () => {
  const [status, setStatus] = useState<CompileStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  return {
    status,
    setStatus,
    errorMsg,
    setErrorMsg,
    isCompiling: status === "compiling",
    isError: status === "error",
    isDone: status === "done",
  };
};
