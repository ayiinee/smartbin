import { useEffect, useState } from "react";

import { fetchBins, fetchDashboard } from "../services/binsApi.js";

export default function useDashboardData() {
  const [dashboard, setDashboard] = useState(null);
  const [bins, setBins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      setIsLoading(true);
      setErrors([]);

      const results = await Promise.allSettled([fetchDashboard(), fetchBins()]);

      if (!isMounted) return;

      const nextErrors = [];
      const [dashboardResult, binsResult] = results;

      if (dashboardResult.status === "fulfilled") {
        setDashboard(dashboardResult.value);
      } else {
        nextErrors.push("Gagal memuat data dashboard.");
      }

      if (binsResult.status === "fulfilled") {
        setBins(binsResult.value);
      } else {
        nextErrors.push("Gagal memuat daftar smartbin.");
      }

      setErrors(nextErrors);
      setIsLoading(false);
    }

    loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    dashboard,
    bins,
    isLoading,
    errors,
  };
}
