import { useState, useEffect, useRef } from "react";
import { pgAPI, tenantAPI, paymentAPI } from "../../services/api";
import { supabase } from "../../lib/supabaseClient";
import { useTheme } from "../../context/ThemeContext";

export const useTenantFinder = () => {
  r, InfoPill, DocCard, FinanceRow } from "./TenantFinderComponents";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { pgAPI, tenantAPI, paymentAPI } from "../../services/api";
import { 
  Search, User, Phone, Mail, MapPin, X,
  Calendar, Building2, ChevronRight, 
  ChevronLeft, Filter, SearchCode,
  Sparkles, Fingerprint, ShieldCheck, Shield,
  Sun, Moon, RotateCw, CheckCircle2, Briefcase
} from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { useTheme } from "../../context/ThemeContext";
import ThemeToggle from "../../components/ThemeToggle";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabaseClient";
import ConfirmationModal from "../../components/ConfirmationModal";
import AlertModal from "../../components/AlertModal";
import Toast from "../../components/Toast";

import { cn } from "../../lib/utils";

const TenantFinder = () => {
  

  return {
    theme, toggleTheme, isDark,
    ,
    ,
    showToast,
    getMonthlyDuesInfo,
    syncMonthlyBalance,
    confirmBalanceSync,
    fetchData,
    filterSelectRef,
    PROFESSION_OPTIONS
  };
};
