import React, { useState, useEffect } from 'react';
import { pgAPI, roomAPI, bedAPI, floorAPI } from '../services/api';
import { supabase } from '../lib/supabaseClient';
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ChevronDown, Building2, Layers, DoorOpen, Bed as BedIcon, AlertCircle } from 'lucide-react';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const HierarchySelector = ({ 
  onSelectionComplete, 
  isDark = false,
  initialValues = {},
  showRooms = true, 
  showBeds = true,
  errorFields = {} // New prop for error highlighting
}) => {
  const [pgs, setPgs] = useState([]);
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [beds, setBeds] = useState([]);

  const [selection, setSelection] = useState({
    pgId: initialValues.pgId || '',
    floorId: initialValues.floorId || '',
    roomId: initialValues.roomId || '',
    bedId: initialValues.bedId || ''
  });

  const [loadingStates, setLoadingStates] = useState({
    pgs: false,
    floors: false,
    rooms: false,
    beds: false
  });
  
  const [highlightPg, setHighlightPg] = useState(false);
  const [highlightFloor, setHighlightFloor] = useState(false);
  const [highlightRoom, setHighlightRoom] = useState(false);

  const [error, setError] = useState(null);

  // Initial load of PGs
  useEffect(() => {
    const loadPGs = async () => {
      setLoadingStates(prev => ({ ...prev, pgs: true }));
      try {
        const data = await pgAPI.getAll();
        setPgs(data || []);
      } catch (err) {
        setError('Failed to load PGs');
      } finally {
        setLoadingStates(prev => ({ ...prev, pgs: false }));
      }
    };
    loadPGs();
  }, []);

  // Handle Floors when PG changes
  useEffect(() => {
    if (!selection.pgId) {
      setFloors([]);
      return;
    }

    const loadFloors = async () => {
        setLoadingStates(prev => ({ ...prev, floors: true }));
        try {
            // Fetch floors from DB to support dynamic additions
            const floorsData = await floorAPI.getByPgId(selection.pgId);
            
            // Fallback for legacy data if no floors exist but totalFloors is set (optional, but good for safety)
            // But primarily we want real DB floors.
            if (floorsData && floorsData.length > 0) {
                 setFloors(floorsData.map(f => ({
                     ...f,
                     name: (f.floor_number || f.floorNumber || 0) === 0 ? "Ground Floor" : `Floor ${f.floor_number || f.floorNumber || 0}`, // Standardize name if missing
                     floor_number: f.floor_number || f.floorNumber // Ensure consistency
                 })));
            } else {
                 // FALLBACK: Generate from totalFloors for legacy/migrated PGs
                 const selectedPg = pgs.find(p => p.id === selection.pgId);
                 if (selectedPg && selectedPg.totalFloors !== undefined) {
                     console.log("[Hierarchy] Using fallback floor generation for PG:", selectedPg.name);
                     const generatedFloors = Array.from({ length: selectedPg.totalFloors + 1 }, (_, i) => ({
                        id: i, // Use index as ID for generated floors (legacy behavior)
                        name: i === 0 ? "Ground Floor" : `Floor ${i}`,
                        floorNumber: i,
                        floor_number: i
                     }));
                     setFloors(generatedFloors);
                 } else {
                     setFloors([]);
                 }
            }
        } catch (err) {
            console.error("Failed to load floors:", err);
            setError('Failed to load floors');
        } finally {
            setLoadingStates(prev => ({ ...prev, floors: false }));
        }
    };
    
    loadFloors();
  }, [selection.pgId, pgs]);

  // Fetch rooms when PG or Floor changes
  useEffect(() => {
    if (!selection.pgId || selection.floorId === '' || !showRooms) {
      setRooms([]);
      return;
    }
    
    console.log("[Hierarchy] Fetching rooms for:", { pgId: selection.pgId, floor: Number(selection.floorId) });

    const loadRooms = async () => {
      setLoadingStates(prev => ({ ...prev, rooms: true }));
      try {
        // Fetch rooms by pgId and floorNumber
        const { data, error } = await supabase
            .from("rooms")
            .select("*")
            .eq("pg_id", selection.pgId)
            .eq("floor", Number(selection.floorId)) // Use correct field name
            .neq("status", "MAINTENANCE")
            .order("room_number");
        
        if (error) throw error;
        setRooms(data || []);
      } catch (err) {
        console.error("Failed to load rooms:", err);
        setError('Failed to load rooms');
      } finally {
        setLoadingStates(prev => ({ ...prev, rooms: false }));
      }
    };
    loadRooms();
  }, [selection.pgId, selection.floorId, showRooms]);

  // Fetch beds when Room changes
  useEffect(() => {
    if (!selection.roomId || !showBeds) {
      setBeds([]);
      return;
    }

    const loadBeds = async () => {
      setLoadingStates(prev => ({ ...prev, beds: true }));
      try {
        const data = await bedAPI.getByRoomId(selection.roomId);
        setBeds(data || []);
      } catch (err) {
        setError('Failed to load beds');
      } finally {
        setLoadingStates(prev => ({ ...prev, beds: false }));
      }
    };
    loadBeds();
  }, [selection.roomId, showBeds]);

  // Sync initialValues to selection state when they change externally
  useEffect(() => {
    if (initialValues.pgId !== undefined || initialValues.floorId !== undefined || initialValues.roomId !== undefined || initialValues.bedId !== undefined) {
      setSelection({
        pgId: initialValues.pgId || '',
        floorId: initialValues.floorId !== undefined ? initialValues.floorId : '',
        roomId: initialValues.roomId || '',
        bedId: initialValues.bedId || ''
      });
    }
  }, [initialValues.pgId, initialValues.floorId, initialValues.roomId, initialValues.bedId]);

  const handleSelectionChange = (field, value) => {
    let newSelection = { ...selection, [field]: value };
    
    // Reset child elements
    if (field === 'pgId') {
      newSelection.floorId = '';
      newSelection.roomId = '';
      newSelection.bedId = '';
    } else if (field === 'floorId') {
      newSelection.roomId = '';
      newSelection.bedId = '';
    } else if (field === 'roomId') {
      newSelection.bedId = '';
    }

    console.log("[HierarchySelector] Selection Changed:", { field, value, newSelection });

    setSelection(newSelection);
    if (onSelectionComplete) {
      onSelectionComplete(newSelection);
    }
  };

  const SelectField = ({ label, value, onChange, options, disabled, loading, icon: Icon, placeholder, tooltip, className, hasError }) => {
    const selectedOption = options.find(o => String(o.id) === String(value));
    
    return (
      <div 
        className={cn("space-y-1.5 w-full", className)}
        onClick={() => {
            if (disabled && !loading) {
                if (label === "Floor" || (label === "Room" && !selection.pgId) || (label === "Bed" && !selection.pgId)) {
                    setHighlightPg(true);
                    setTimeout(() => setHighlightPg(false), 2000);
                } else if (label === "Room" && !selection.floorId) {
                    setHighlightFloor(true);
                    setTimeout(() => setHighlightFloor(false), 2000);
                } else if (label === "Bed" && !selection.roomId) {
                    setHighlightRoom(true);
                    setTimeout(() => setHighlightRoom(false), 2000);
                }
            }
        }}
      >
        <div className="flex items-center justify-between px-1">
          <label className={cn("text-[10px] font-bold uppercase tracking-widest", isDark ? "text-slate-500" : "text-slate-600")}>
            {label}
          </label>
          {disabled && !loading && tooltip && (
              <span className="text-[9px] font-bold text-rose-500/80 uppercase tracking-tighter animate-pulse">
                  {tooltip}
              </span>
          )}
        </div>
        <div className="relative group">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled || loading}
            className={cn(
              "w-full appearance-none pl-11 pr-10 py-3.5 rounded-2xl border text-sm font-semibold transition-all focus:outline-none focus:ring-4 disabled:opacity-40 disabled:cursor-not-allowed",
              isDark 
                ? "bg-slate-800/50 border-white/5 text-white focus:ring-blue-500/20" 
                : "bg-white border-slate-200 text-slate-900 focus:ring-blue-500/10",
              hasError && "border-rose-500 focus:ring-rose-500/20",
              label === "PG Property" && highlightPg && "ring-4 ring-blue-500 border-blue-500 scale-[1.02] shadow-xl z-10",
              label === "Floor" && highlightFloor && "ring-4 ring-blue-500 border-blue-500 scale-[1.02] shadow-xl z-10",
              label === "Room" && highlightRoom && "ring-4 ring-blue-500 border-blue-500 scale-[1.02] shadow-xl z-10"
            )}
          >
            <option value="">{loading ? 'Fetching data...' : placeholder}</option>
            {options.map(opt => (
              <option key={opt.id} value={opt.id} className={isDark ? "bg-slate-900" : "bg-white"}>
                {opt.name || (opt.floor_number !== undefined ? (opt.floor_number === 0 ? "Ground Floor" : `Floor ${opt.floor_number}`) : (opt.roomNumber || opt.room_number || opt.bedNumber || opt.bed_number))}
                {opt.capacity !== undefined && ` (${opt.currentOccupancy ?? opt.current_occupancy ?? 0}/${opt.capacity} Occupied)`}
              </option>
            ))}
          </select>
          <div className={cn("absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors", disabled ? "text-slate-600" : "text-blue-500")}>
            <Icon size={18} strokeWidth={2.5} />
          </div>
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
            <ChevronDown size={16} strokeWidth={3} />
          </div>
        </div>
        
        {/* Contextual Indicators */}
        {!disabled && !loading && value && (
            <div className="px-1 flex items-center justify-between">
                {label === "Floor" && options.length > 0 && (
                    <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">
                        {rooms.length} Rooms mapped
                    </span>
                )}
                {label === "Room" && selectedOption && (
                    <span className={cn(
                        "text-[9px] font-bold uppercase tracking-widest",
                        (selectedOption.capacity - (selectedOption.currentOccupancy ?? selectedOption.current_occupancy ?? 0)) <= 0 ? "text-rose-500" : "text-slate-600"
                    )}>
                        {selectedOption.currentOccupancy ?? selectedOption.current_occupancy ?? 0} / {selectedOption.capacity} Occupied
                    </span>
                )}
            </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full space-y-4">
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-3 rounded-xl flex items-center gap-2 text-xs">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SelectField 
          label="PG Property"
          value={selection.pgId}
          onChange={(val) => handleSelectionChange('pgId', val)}
          options={pgs}
          loading={loadingStates.pgs}
          icon={Building2}
          placeholder="Select Property"
          hasError={!!errorFields.pgId || !!errorFields.pg_id}
        />
        
        <SelectField 
          label="Floor"
          value={selection.floorId}
          onChange={(val) => handleSelectionChange('floorId', val)}
          options={floors}
          disabled={!selection.pgId}
          loading={loadingStates.floors}
          icon={Layers}
          placeholder="Select Floor"
          hasError={!!errorFields.floorId || !!errorFields.floor_number}
        />

        {showRooms && (
          <SelectField 
            label="Room"
            value={selection.roomId}
            onChange={(val) => handleSelectionChange('roomId', val)}
            options={rooms}
            disabled={!selection.floorId}
            loading={loadingStates.rooms}
            icon={DoorOpen}
            placeholder="Select Room"
            tooltip="Select Floor first"
            className={!showBeds ? "md:col-span-2" : ""}
            hasError={!!errorFields.roomId || !!errorFields.room_id}
          />
        )}

        {showBeds && (
            <SelectField 
              label="Bed"
              value={selection.bedId}
              onChange={(val) => handleSelectionChange('bedId', val)}
              options={beds}
              disabled={!selection.roomId}
              loading={loadingStates.beds}
              icon={BedIcon}
              placeholder="Select Bed"
              tooltip="Select Room first"
              className={showRooms ? "" : "md:col-span-2"}
              hasError={!!errorFields.bedId || !!errorFields.bed_id}
            />
        )}
      </div>
    </div>
  );
};

export default HierarchySelector;
