import { useEffect, useState } from "react";

import { fetchBinById } from "../services/binsApi.js";

export default function useSmartbin(id) {
  const [bin, setBin] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;

    let isMounted = true;

    async function loadBin() {
      setIsLoading(true);
      setError("");
      try {
        const payload = await fetchBinById(id);
        if (isMounted) {
          setBin(payload);
        }
      } catch (err) {
        if (isMounted) {
          setError("Gagal memuat data smartbin.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadBin();

    return () => {
      isMounted = false;
    };
  }, [id]);

  return { bin, isLoading, error };
}
