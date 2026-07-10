import { useEffect, useState } from "react";
import { Employee } from "../types";

export const getEmployees = (): Employee[] => {
  if (typeof window === "undefined") return [];
  try {
    const ls = localStorage.getItem("pc-employees");
    if (ls) {
      return JSON.parse(ls);
    }
  } catch (e) {
    console.error("Error reading employees from localStorage:", e);
  }
  return [];
};

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    setEmployees(getEmployees());

    const handleStorageChange = () => {
      setEmployees(getEmployees());
    };

    window.addEventListener("pc-employees-change", handleStorageChange);
    return () => {
      window.removeEventListener("pc-employees-change", handleStorageChange);
    };
  }, []);

  return employees;
}
