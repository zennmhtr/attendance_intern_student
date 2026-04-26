import BlastSonner, { BlastType } from "@/Components/custom/BlastSonner";
import { ErrorInput } from "@/Components/custom/FormElement";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { Separator } from "@/Components/ui/separator";
import { MainLayout } from "@/Layouts/MainLayout";
import { PageTitle } from "@/Partials/PageTitle";
import axios from "axios";
import React, { useState } from "react";
import {
    FiClock,
    FiEdit2,
    FiLoader,
    FiPlus,
    FiSave,
    FiToggleLeft,
    FiToggleRight,
    FiTrash2,
    FiX,
} from "react-icons/fi";

type Shift = {
    id: number;
    name: string;
    location: string;
    check_in_start: string;
    check_in_end: string;
    check_out_start: string;
    check_out_end: string;
    is_active: boolean;
};

type GroupedLocation = {
    location: string;
    shifts: Shift[];
};

type ShiftIndexProps = {
    title: string;
    grouped: GroupedLocation[];
};

const getCsrfToken = (): string =>
    document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") ?? "";

const emptyForm = {
    name: "",
    location: "",
    check_in_start: "",
    check_in_end: "",
    check_out_start: "",
    check_out_end: "",
};

function ShiftRow({
    shift,
    onUpdated,
    onDeleted,
    onToggled,
}: {
    shift: Shift;
    onUpdated: (updated: Shift) => void;
    onDeleted: (id: number) => void;
    onToggled: (id: number, is_active: boolean) => void;
}) {
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name:            shift.name,
        location:        shift.location,
        check_in_start:  shift.check_in_start,
        check_in_end:    shift.check_in_end,
        check_out_start: shift.check_out_start,
        check_out_end:   shift.check_out_end,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.name)            e.name            = "Nama shift wajib diisi";
        if (!form.location)        e.location        = "Lokasi wajib diisi";
        if (!form.check_in_start)  e.check_in_start  = "Wajib diisi";
        if (!form.check_in_end)    e.check_in_end    = "Wajib diisi";
        if (!form.check_out_start) e.check_out_start = "Wajib diisi";
        if (!form.check_out_end)   e.check_out_end   = "Wajib diisi";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;
        setLoading(true);
        try {
            const res = await axios.put(`/admin/shift/${shift.id}`, form, {
                headers: { "X-CSRF-TOKEN": getCsrfToken(), Accept: "application/json" },
            });
            onUpdated({ ...shift, ...form });
            setEditing(false);
            BlastSonner({ type: BlastType.SUCCESS, message: res.data.message });
        } catch (err: any) {
            BlastSonner({ type: BlastType.ERROR, message: err?.response?.data?.message ?? "Gagal memperbarui shift" });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm(`Hapus ${shift.name} — ${shift.location}?`)) return;
        setLoading(true);
        try {
            const res = await axios.delete(`/admin/shift/${shift.id}`, {
                headers: { "X-CSRF-TOKEN": getCsrfToken(), Accept: "application/json" },
            });
            onDeleted(shift.id);
            BlastSonner({ type: BlastType.SUCCESS, message: res.data.message });
        } catch (err: any) {
            BlastSonner({ type: BlastType.ERROR, message: err?.response?.data?.message ?? "Gagal menghapus shift" });
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async () => {
        setLoading(true);
        try {
            const res = await axios.post(`/admin/shift/${shift.id}/toggle`, {}, {
                headers: { "X-CSRF-TOKEN": getCsrfToken(), Accept: "application/json" },
            });
            onToggled(shift.id, res.data.is_active);
            BlastSonner({ type: BlastType.SUCCESS, message: res.data.message });
        } catch (err: any) {
            BlastSonner({ type: BlastType.ERROR, message: err?.response?.data?.message ?? "Gagal mengubah status" });
        } finally {
            setLoading(false);
        }
    };

    if (!editing) {
        return (
            <div className={`flex items-center justify-between p-4 rounded-xl border bg-white shadow-sm ${!shift.is_active ? "opacity-50" : ""}`}>
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-800">{shift.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${shift.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-500"}`}>
                            {shift.is_active ? "Aktif" : "Nonaktif"}
                        </span>
                    </div>
                    <div className="flex gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                            <FiClock size={12} />
                            Masuk: <strong>{shift.check_in_start}</strong> – <strong>{shift.check_in_end}</strong>
                        </span>
                        <span className="flex items-center gap-1">
                            <FiClock size={12} />
                            Pulang: <strong>{shift.check_out_start}</strong> – <strong>{shift.check_out_end}</strong>
                        </span>
                    </div>
                </div>
                <div className="flex gap-2 items-center">
                    {/* Toggle aktif/nonaktif */}
                    <button
                        type="button"
                        onClick={handleToggle}
                        disabled={loading}
                        title={shift.is_active ? "Nonaktifkan" : "Aktifkan"}
                        className={`text-xl transition-colors ${shift.is_active ? "text-green-500 hover:text-green-700" : "text-gray-400 hover:text-green-500"}`}
                    >
                        {shift.is_active ? <FiToggleRight size={24} /> : <FiToggleLeft size={24} />}
                    </button>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setEditing(true)}
                        disabled={loading}
                        className="text-blue-600 border-blue-300 hover:bg-blue-50"
                    >
                        <FiEdit2 size={14} />
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleDelete}
                        disabled={loading}
                        className="text-red-500 border-red-300 hover:bg-red-50"
                    >
                        {loading ? <FiLoader className="animate-spin" size={14} /> : <FiTrash2 size={14} />}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 rounded-xl border-2 border-blue-300 bg-blue-50 shadow-sm flex flex-col gap-3">
            <div className="flex gap-3">
                <div className="flex flex-col w-full">
                    <label className="text-sm font-medium text-gray-700 mb-1">Lokasi</label>
                    <Input
                        value={form.location}
                        onChange={(e) => setForm({ ...form, location: e.target.value })}
                        placeholder="Contoh: HOTEL MERCURE"
                        className={errors.location ? "border-red-500" : ""}
                    />
                    {errors.location && <ErrorInput error={errors.location} />}
                </div>
                <div className="flex flex-col w-full">
                    <label className="text-sm font-medium text-gray-700 mb-1">Nama Shift</label>
                    <Input
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Contoh: SHIFT 1"
                        className={errors.name ? "border-red-500" : ""}
                    />
                    {errors.name && <ErrorInput error={errors.name} />}
                </div>
            </div>

            <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Window Absensi Masuk</label>
                <div className="flex gap-3 items-center">
                    <div className="w-full">
                        <Input type="time" value={form.check_in_start}
                            onChange={(e) => setForm({ ...form, check_in_start: e.target.value })}
                            className={`text-sm ${errors.check_in_start ? "border-red-500" : ""}`} />
                        {errors.check_in_start && <ErrorInput error={errors.check_in_start} />}
                    </div>
                    <span className="text-gray-400 text-sm shrink-0">s/d</span>
                    <div className="w-full">
                        <Input type="time" value={form.check_in_end}
                            onChange={(e) => setForm({ ...form, check_in_end: e.target.value })}
                            className={`text-sm ${errors.check_in_end ? "border-red-500" : ""}`} />
                        {errors.check_in_end && <ErrorInput error={errors.check_in_end} />}
                    </div>
                </div>
            </div>

            <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Window Absensi Pulang</label>
                <div className="flex gap-3 items-center">
                    <div className="w-full">
                        <Input type="time" value={form.check_out_start}
                            onChange={(e) => setForm({ ...form, check_out_start: e.target.value })}
                            className={`text-sm ${errors.check_out_start ? "border-red-500" : ""}`} />
                        {errors.check_out_start && <ErrorInput error={errors.check_out_start} />}
                    </div>
                    <span className="text-gray-400 text-sm shrink-0">s/d</span>
                    <div className="w-full">
                        <Input type="time" value={form.check_out_end}
                            onChange={(e) => setForm({ ...form, check_out_end: e.target.value })}
                            className={`text-sm ${errors.check_out_end ? "border-red-500" : ""}`} />
                        {errors.check_out_end && <ErrorInput error={errors.check_out_end} />}
                    </div>
                </div>
            </div>

            <div className="flex gap-2 justify-end">
                <Button type="button" size="sm" variant="outline"
                    onClick={() => { setEditing(false); setErrors({}); }}>
                    <FiX size={14} className="mr-1" /> Batal
                </Button>
                <Button type="button" size="sm" onClick={handleSave} disabled={loading}
                    className="bg-blue-500 hover:bg-blue-600 text-white">
                    {loading ? <FiLoader className="animate-spin mr-1" size={14} /> : <FiSave size={14} className="mr-1" />}
                    Simpan
                </Button>
            </div>
        </div>
    );
}

function AddShiftForm({
    defaultLocation,
    onAdded,
}: {
    defaultLocation: string;
    onAdded: (shift: Shift) => void;
}) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ ...emptyForm, location: defaultLocation });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.name)            e.name            = "Nama shift wajib diisi";
        if (!form.location)        e.location        = "Lokasi wajib diisi";
        if (!form.check_in_start)  e.check_in_start  = "Wajib diisi";
        if (!form.check_in_end)    e.check_in_end    = "Wajib diisi";
        if (!form.check_out_start) e.check_out_start = "Wajib diisi";
        if (!form.check_out_end)   e.check_out_end   = "Wajib diisi";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleAdd = async () => {
        if (!validate()) return;
        setLoading(true);
        try {
            const res = await axios.post(`/admin/shift`, form, {
                headers: { "X-CSRF-TOKEN": getCsrfToken(), Accept: "application/json" },
            });
            onAdded(res.data.shift);
            setForm({ ...emptyForm, location: defaultLocation });
            setOpen(false);
            BlastSonner({ type: BlastType.SUCCESS, message: res.data.message });
        } catch (err: any) {
            BlastSonner({ type: BlastType.ERROR, message: err?.response?.data?.message ?? "Gagal menambah shift" });
        } finally {
            setLoading(false);
        }
    };

    if (!open) {
        return (
            <button type="button" onClick={() => setOpen(true)}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-blue-300 text-blue-500 hover:bg-blue-50 transition-colors text-sm font-medium">
                <FiPlus size={16} /> Tambah Shift
            </button>
        );
    }

    return (
        <div className="p-4 rounded-xl border-2 border-green-300 bg-green-50 shadow-sm flex flex-col gap-3">
            <h4 className="font-semibold text-green-700 text-sm">Tambah Shift Baru</h4>

            <div className="flex gap-3">
                <div className="flex flex-col w-full">
                    <label className="text-sm font-medium text-gray-700 mb-1">Lokasi</label>
                    <Input value={form.location}
                        onChange={(e) => setForm({ ...form, location: e.target.value })}
                        placeholder="Contoh: HOTEL MERCURE"
                        className={errors.location ? "border-red-500" : ""} />
                    {errors.location && <ErrorInput error={errors.location} />}
                </div>
                <div className="flex flex-col w-full">
                    <label className="text-sm font-medium text-gray-700 mb-1">Nama Shift</label>
                    <Input value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Contoh: SHIFT 1"
                        className={errors.name ? "border-red-500" : ""} />
                    {errors.name && <ErrorInput error={errors.name} />}
                </div>
            </div>

            <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Window Absensi Masuk</label>
                <div className="flex gap-3 items-center">
                    <div className="w-full">
                        <Input type="time" value={form.check_in_start}
                            onChange={(e) => setForm({ ...form, check_in_start: e.target.value })}
                            className={`text-sm ${errors.check_in_start ? "border-red-500" : ""}`} />
                        {errors.check_in_start && <ErrorInput error={errors.check_in_start} />}
                    </div>
                    <span className="text-gray-400 text-sm shrink-0">s/d</span>
                    <div className="w-full">
                        <Input type="time" value={form.check_in_end}
                            onChange={(e) => setForm({ ...form, check_in_end: e.target.value })}
                            className={`text-sm ${errors.check_in_end ? "border-red-500" : ""}`} />
                        {errors.check_in_end && <ErrorInput error={errors.check_in_end} />}
                    </div>
                </div>
            </div>

            <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Window Absensi Pulang</label>
                <div className="flex gap-3 items-center">
                    <div className="w-full">
                        <Input type="time" value={form.check_out_start}
                            onChange={(e) => setForm({ ...form, check_out_start: e.target.value })}
                            className={`text-sm ${errors.check_out_start ? "border-red-500" : ""}`} />
                        {errors.check_out_start && <ErrorInput error={errors.check_out_start} />}
                    </div>
                    <span className="text-gray-400 text-sm shrink-0">s/d</span>
                    <div className="w-full">
                        <Input type="time" value={form.check_out_end}
                            onChange={(e) => setForm({ ...form, check_out_end: e.target.value })}
                            className={`text-sm ${errors.check_out_end ? "border-red-500" : ""}`} />
                        {errors.check_out_end && <ErrorInput error={errors.check_out_end} />}
                    </div>
                </div>
            </div>

            <div className="flex gap-2 justify-end">
                <Button type="button" size="sm" variant="outline"
                    onClick={() => { setOpen(false); setErrors({}); setForm({ ...emptyForm, location: defaultLocation }); }}>
                    <FiX size={14} className="mr-1" /> Batal
                </Button>
                <Button type="button" size="sm" onClick={handleAdd} disabled={loading}
                    className="bg-green-500 hover:bg-green-600 text-white">
                    {loading ? <FiLoader className="animate-spin mr-1" size={14} /> : <FiPlus size={14} className="mr-1" />}
                    Tambah
                </Button>
            </div>
        </div>
    );
}

function LocationCard({ group }: { group: GroupedLocation }) {
    const [shifts, setShifts] = useState<Shift[]>(group.shifts);

    const handleUpdated = (updated: Shift) =>
        setShifts((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));

    const handleDeleted = (id: number) =>
        setShifts((prev) => prev.filter((s) => s.id !== id));

    const handleToggled = (id: number, is_active: boolean) =>
        setShifts((prev) => prev.map((s) => (s.id === id ? { ...s, is_active } : s)));

    const handleAdded = (shift: Shift) =>
        setShifts((prev) => [...prev, shift]);

    return (
        <div className="mb-6">
            {/* Header lokasi */}
            <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-sm font-bold text-gray-600 uppercase tracking-widest px-2 whitespace-nowrap flex items-center gap-2">
                    🏨 {group.location}
                    <span className="text-xs font-normal text-gray-400 normal-case tracking-normal">
                        ({shifts.length} shift)
                    </span>
                </span>
                <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Shift list */}
            <div className="flex flex-col gap-2 mb-3">
                {shifts.length === 0 && (
                    <p className="text-center text-sm text-gray-400 py-4">
                        Belum ada shift untuk lokasi ini
                    </p>
                )}
                {shifts.map((shift) => (
                    <ShiftRow
                        key={shift.id}
                        shift={shift}
                        onUpdated={handleUpdated}
                        onDeleted={handleDeleted}
                        onToggled={handleToggled}
                    />
                ))}
            </div>

            <AddShiftForm defaultLocation={group.location} onAdded={handleAdded} />
        </div>
    );
}

function AddNewLocation({ onAdded }: { onAdded: (group: GroupedLocation) => void }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ ...emptyForm });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.location)        e.location        = "Lokasi wajib diisi";
        if (!form.name)            e.name            = "Nama shift wajib diisi";
        if (!form.check_in_start)  e.check_in_start  = "Wajib diisi";
        if (!form.check_in_end)    e.check_in_end    = "Wajib diisi";
        if (!form.check_out_start) e.check_out_start = "Wajib diisi";
        if (!form.check_out_end)   e.check_out_end   = "Wajib diisi";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleAdd = async () => {
        if (!validate()) return;
        setLoading(true);
        try {
            const res = await axios.post(`/admin/shift`, form, {
                headers: { "X-CSRF-TOKEN": getCsrfToken(), Accept: "application/json" },
            });
            onAdded({ location: form.location, shifts: [res.data.shift] });
            setForm({ ...emptyForm });
            setOpen(false);
            BlastSonner({ type: BlastType.SUCCESS, message: res.data.message });
        } catch (err: any) {
            BlastSonner({ type: BlastType.ERROR, message: err?.response?.data?.message ?? "Gagal menambah shift" });
        } finally {
            setLoading(false);
        }
    };

    if (!open) {
        return (
            <button type="button" onClick={() => setOpen(true)}
                className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50 transition-colors text-sm font-medium mt-2">
                <FiPlus size={18} /> Tambah Lokasi Hotel Baru
            </button>
        );
    }

    return (
        <div className="p-4 rounded-xl border-2 border-blue-300 bg-blue-50 shadow-sm flex flex-col gap-3 mt-2">
            <h4 className="font-semibold text-blue-700 text-sm">Tambah Lokasi Hotel Baru</h4>

            <div className="flex gap-3">
                <div className="flex flex-col w-full">
                    <label className="text-sm font-medium text-gray-700 mb-1">Nama Lokasi</label>
                    <Input value={form.location}
                        onChange={(e) => setForm({ ...form, location: e.target.value.toUpperCase() })}
                        placeholder="Contoh: HOTEL MERCURE"
                        className={errors.location ? "border-red-500" : ""} />
                    {errors.location && <ErrorInput error={errors.location} />}
                </div>
                <div className="flex flex-col w-full">
                    <label className="text-sm font-medium text-gray-700 mb-1">Nama Shift Pertama</label>
                    <Input value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value.toUpperCase() })}
                        placeholder="Contoh: SHIFT 1"
                        className={errors.name ? "border-red-500" : ""} />
                    {errors.name && <ErrorInput error={errors.name} />}
                </div>
            </div>

            <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Window Absensi Masuk</label>
                <div className="flex gap-3 items-center">
                    <div className="w-full">
                        <Input type="time" value={form.check_in_start}
                            onChange={(e) => setForm({ ...form, check_in_start: e.target.value })}
                            className={`text-sm ${errors.check_in_start ? "border-red-500" : ""}`} />
                        {errors.check_in_start && <ErrorInput error={errors.check_in_start} />}
                    </div>
                    <span className="text-gray-400 text-sm shrink-0">s/d</span>
                    <div className="w-full">
                        <Input type="time" value={form.check_in_end}
                            onChange={(e) => setForm({ ...form, check_in_end: e.target.value })}
                            className={`text-sm ${errors.check_in_end ? "border-red-500" : ""}`} />
                        {errors.check_in_end && <ErrorInput error={errors.check_in_end} />}
                    </div>
                </div>
            </div>

            <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Window Absensi Pulang</label>
                <div className="flex gap-3 items-center">
                    <div className="w-full">
                        <Input type="time" value={form.check_out_start}
                            onChange={(e) => setForm({ ...form, check_out_start: e.target.value })}
                            className={`text-sm ${errors.check_out_start ? "border-red-500" : ""}`} />
                        {errors.check_out_start && <ErrorInput error={errors.check_out_start} />}
                    </div>
                    <span className="text-gray-400 text-sm shrink-0">s/d</span>
                    <div className="w-full">
                        <Input type="time" value={form.check_out_end}
                            onChange={(e) => setForm({ ...form, check_out_end: e.target.value })}
                            className={`text-sm ${errors.check_out_end ? "border-red-500" : ""}`} />
                        {errors.check_out_end && <ErrorInput error={errors.check_out_end} />}
                    </div>
                </div>
            </div>

            <div className="flex gap-2 justify-end">
                <Button type="button" size="sm" variant="outline"
                    onClick={() => { setOpen(false); setErrors({}); setForm({ ...emptyForm }); }}>
                    <FiX size={14} className="mr-1" /> Batal
                </Button>
                <Button type="button" size="sm" onClick={handleAdd} disabled={loading}
                    className="bg-blue-500 hover:bg-blue-600 text-white">
                    {loading ? <FiLoader className="animate-spin mr-1" size={14} /> : <FiPlus size={14} className="mr-1" />}
                    Tambah
                </Button>
            </div>
        </div>
    );
}

export default function ShiftIndex({ title, grouped }: ShiftIndexProps) {
    const [groups, setGroups] = useState<GroupedLocation[]>(grouped);

    const handleNewGroup = (group: GroupedLocation) => {
        setGroups((prev) => {
            const exists = prev.find((g) => g.location === group.location);
            if (exists) {
                return prev.map((g) =>
                    g.location === group.location
                        ? { ...g, shifts: [...g.shifts, ...group.shifts] }
                        : g
                );
            }
            return [...prev, group];
        });
    };

    return (
        <MainLayout title={title}>
            <PageTitle
                title={title}
                description="Kelola jadwal shift absensi untuk siswa jurusan TBOG"
            />

            {/* Info box */}
            <div className="mb-4 p-4 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-700">
                <strong>Catatan:</strong> Shift ini khusus untuk siswa jurusan <strong>TBOG</strong>.
                Siswa akan memilih shift aktif setiap hari sebelum absen.{" "}
                <em>Window Absensi Masuk</em> adalah rentang waktu check-in diperbolehkan,
                dan <em>Window Absensi Pulang</em> untuk check-out. Toleransi otomatis ±15 menit.
            </div>

            <Separator className="my-5 h-1 rounded-full bg-blue-200" />

            {groups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <FiClock size={48} className="mb-3 opacity-40" />
                    <p className="text-base font-medium">Belum ada shift terdaftar</p>
                    <p className="text-sm mt-1">Tambahkan lokasi hotel dan shift pertama di bawah</p>
                </div>
            ) : (
                groups.map((group) => (
                    <LocationCard key={group.location} group={group} />
                ))
            )}

            {/* Tambah lokasi baru */}
            <AddNewLocation onAdded={handleNewGroup} />
        </MainLayout>
    );
}