import { ErrorInput } from "@/Components/custom/FormElement";
import { Input } from "@/Components/ui/input";
import { MainLayout } from "@/Layouts/MainLayout";
import { PageTitle } from "@/Partials/PageTitle";
import { useForm } from "@inertiajs/react";
import { FilePond, registerPlugin } from "react-filepond";
import FilePondPluginImagePreview from "filepond-plugin-image-preview";
import FilePondPluginFileValidateType from "filepond-plugin-file-validate-type";
import React, { useState, useEffect } from "react";
import MapPicker from "@/Components/custom/MapPicker";
import { Separator } from "@/Components/ui/separator";
import axios from "axios";
import BlastSonner, { BlastType } from "@/Components/custom/BlastSonner";
import { inputDebounce } from "@/Services/additionalService";
import { FiClock, FiExternalLink, FiLoader, FiSave } from "react-icons/fi";
import { Button } from "@/Components/ui/button";
import { Textarea } from "@/Components/ui/textarea";
import { Link } from "@inertiajs/react";

registerPlugin(FilePondPluginFileValidateType, FilePondPluginImagePreview);

// ─── Types ────────────────────────────────────────────────────────────────────

type GlobalSetting = {
    id?: number;
    app_name: string;
    app_icon: string | null;
    default_latitude: number;
    default_longitude: number;
    max_attendance_radius: number;
    check_in_start: string;
    check_in_end: string;
    check_out_start: string;
    check_out_end: string;
    school_name: string;
    school_icon: string | null;
    school_address: string;
    school_phone: string;
    school_email: string;
    school_website: string;
    is_student_active: boolean;
    is_supervisor_active: boolean;
    created_at?: string;
    updated_at?: string;
};

type AppSettingProps = {
    title: string;
    app_setting: GlobalSetting;
};

// ─── Helper ───────────────────────────────────────────────────────────────────

const getCsrfToken = (): string =>
    document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") ?? "";

// ─── SystemToggle ─────────────────────────────────────────────────────────────

function SystemToggle({
    label,
    description,
    isActive,
    onToggle,
    loading,
}: {
    label: string;
    description: string;
    isActive: boolean;
    onToggle: () => void;
    loading: boolean;
}) {
    return (
        <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-col">
                <span className="font-semibold text-gray-800">{label}</span>
                <span className="text-sm text-gray-500">{description}</span>
                <span className={`text-xs font-medium mt-1 ${isActive ? "text-green-600" : "text-red-500"}`}>
                    {isActive ? "● Sistem Aktif" : "● Sistem Nonaktif"}
                </span>
            </div>
            <button
                type="button"
                onClick={onToggle}
                disabled={loading}
                className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors duration-300 focus:outline-none disabled:opacity-50 ${
                    isActive ? "bg-green-500" : "bg-red-400"
                }`}
            >
                <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                        isActive ? "translate-x-9" : "translate-x-1"
                    }`}
                />
            </button>
        </div>
    );
}

// ─── MajorTimeRow — baris info jam per jurusan (read-only display) ────────────

function MajorTimeRow({
    major,
    type,
    checkInStart,
    checkInEnd,
    checkOutStart,
    checkOutEnd,
    badge,
    badgeColor,
}: {
    major: string;
    type: "global" | "shift";
    checkInStart?: string;
    checkInEnd?: string;
    checkOutStart?: string;
    checkOutEnd?: string;
    badge: string;
    badgeColor: string;
}) {
    return (
        <div className="flex items-start justify-between p-4 rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800">{major}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeColor}`}>
                        {badge}
                    </span>
                </div>
                {type === "global" && checkInStart && (
                    <div className="flex flex-col gap-0.5 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                            <FiClock size={12} className="text-green-500" />
                            Absen Masuk: <strong>{checkInStart}</strong> – <strong>{checkInEnd}</strong>
                        </span>
                        <span className="flex items-center gap-1">
                            <FiClock size={12} className="text-blue-500" />
                            Absen Pulang: <strong>{checkOutStart}</strong> – <strong>{checkOutEnd}</strong>
                        </span>
                        <span className="text-xs text-gray-400 mt-0.5">
                            Toleransi otomatis ±15 menit dari window absensi
                        </span>
                    </div>
                )}
                {type === "shift" && (
                    <div className="text-sm text-gray-600">
                        <span>Jam absensi ditentukan per shift di setiap lokasi hotel.</span>
                        <br />
                        <span className="text-xs text-gray-400">
                            Siswa memilih shift aktif setiap hari sebelum absen.
                        </span>
                    </div>
                )}
            </div>
            {type === "shift" && (
                <Link href="/admin/shift">
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="text-blue-600 border-blue-300 hover:bg-blue-50 flex items-center gap-1 shrink-0"
                    >
                        <FiExternalLink size={13} />
                        Kelola Shift
                    </Button>
                </Link>
            )}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AppSetting({ title, app_setting }: AppSettingProps) {
    const [appIconPond, setAppIconPond]       = useState<any[]>([]);
    const [schoolIconPond, setSchoolIconPond] = useState<any[]>([]);
    const [onReversingMaps, setOnReversingMaps] = useState(false);
    const [studentActive, setStudentActive]     = useState<boolean>(app_setting.is_student_active ?? true);
    const [supervisorActive, setSupervisorActive] = useState<boolean>(app_setting.is_supervisor_active ?? true);
    const [toggleLoading, setToggleLoading] = useState(false);

    const { data, setData, errors, post, processing, setError, clearErrors } =
        useForm({
            app_name:              app_setting.app_name              ?? "",
            app_icon:              null as File | null,
            default_latitude:      app_setting.default_latitude      ?? 0,
            default_longitude:     app_setting.default_longitude     ?? 0,
            max_attendance_radius: app_setting.max_attendance_radius ?? 0,
            check_in_start:        app_setting.check_in_start        ?? "",
            check_in_end:          app_setting.check_in_end          ?? "",
            check_out_start:       app_setting.check_out_start       ?? "",
            check_out_end:         app_setting.check_out_end         ?? "",
            school_name:           app_setting.school_name           ?? "",
            school_icon:           null as File | null,
            school_address:        app_setting.school_address        ?? "",
            school_phone:          app_setting.school_phone          ?? "",
            school_email:          app_setting.school_email          ?? "",
            school_website:        app_setting.school_website        ?? "",
            is_student_active:     app_setting.is_student_active     ?? true,
            is_supervisor_active:  app_setting.is_supervisor_active  ?? true,
        });

    useEffect(() => { loadInitiateAppIcon(); }, []);

    const handleToggleSystem = (type: "student" | "supervisor") => {
        setToggleLoading(true);
        const newStatus = type === "student" ? !studentActive : !supervisorActive;
        axios
            .post(
                "/admin/app-setting/toggle-system",
                { type, status: newStatus },
                { headers: { "X-CSRF-TOKEN": getCsrfToken(), Accept: "application/json", "Content-Type": "application/json" } }
            )
            .then((response) => {
                if (response.data.success) {
                    if (type === "student") { setStudentActive(newStatus); setData("is_student_active", newStatus); }
                    else                   { setSupervisorActive(newStatus); setData("is_supervisor_active", newStatus); }
                    BlastSonner({ type: BlastType.SUCCESS, message: response.data.message });
                } else {
                    BlastSonner({ type: BlastType.ERROR, message: response.data.message || "Gagal mengubah status sistem" });
                }
            })
            .catch((error: any) => {
                BlastSonner({ type: BlastType.ERROR, message: error?.response?.data?.message || "Gagal mengubah status sistem" });
            })
            .finally(() => setToggleLoading(false));
    };

    const loadInitiateAppIcon = async () => {
        if (app_setting.app_icon) {
            try {
                const imageUrl = app_setting.app_icon.startsWith("http")
                    ? app_setting.app_icon
                    : `${window.location.origin}${app_setting.app_icon.startsWith("/") ? "" : "/"}${app_setting.app_icon}`;
                const response = await fetch(imageUrl);
                if (response.ok) {
                    const blob = await response.blob();
                    setAppIconPond([new File([blob], "favicon.png", { type: blob.type })]);
                }
            } catch { setAppIconPond([]); }
        }
        if (app_setting.school_icon) {
            try {
                const imageUrl = app_setting.school_icon.startsWith("http")
                    ? app_setting.school_icon
                    : `${window.location.origin}${app_setting.school_icon.startsWith("/") ? "" : "/"}${app_setting.school_icon}`;
                const response = await fetch(imageUrl);
                if (response.ok) {
                    const blob = await response.blob();
                    setSchoolIconPond([new File([blob], "school_icon.png", { type: blob.type })]);
                }
            } catch { setSchoolIconPond([]); }
        }
    };

    const handleLatLang = (key: string, value: number) => {
        if (key === "default_latitude")  setData("default_latitude",  value || 0);
        if (key === "default_longitude") setData("default_longitude", value || 0);
    };

    const debounceRevereseLocation = inputDebounce(async (url: string) => {
        if (!url || url.trim() === "") return;
        try {
            setOnReversingMaps(true);
            const response = await axios.get(`/api/reverse-gmaps-url?url=${encodeURIComponent(url)}`);
            const { latitude, longitude } = response.data;
            setData("default_latitude",  latitude);
            setData("default_longitude", longitude);
        } catch (error: any) {
            BlastSonner({ message: error?.response?.data?.error || "Gagal mengambil koordinat", type: BlastType.ERROR });
        } finally { setOnReversingMaps(false); }
    });

    const handleIcon = (key: "app_icon" | "school_icon", file: File | null) => setData(key, file);

    const validateForm = (): boolean => {
        const errs: any = {};
        if (!data.app_name)                              errs.app_name              = "Nama aplikasi tidak boleh kosong";
        if (!data.app_icon && !app_setting.app_icon)     errs.app_icon              = "Ikon aplikasi tidak boleh kosong";
        if (!data.school_name)                           errs.school_name           = "Nama sekolah tidak boleh kosong";
        if (!data.school_icon && !app_setting.school_icon) errs.school_icon         = "Logo sekolah tidak boleh kosong";
        if (!data.school_address)                        errs.school_address        = "Alamat sekolah tidak boleh kosong";
        if (!data.school_phone)                          errs.school_phone          = "Nomor telepon sekolah tidak boleh kosong";
        if (!data.school_email)                          errs.school_email          = "Email sekolah tidak boleh kosong";
        if (!data.school_website)                        errs.school_website        = "Website sekolah tidak boleh kosong";
        if (!data.default_latitude  || data.default_latitude  === 0) errs.default_latitude  = "Latitude tidak boleh kosong";
        if (!data.default_longitude || data.default_longitude === 0) errs.default_longitude = "Longitude tidak boleh kosong";
        if (!data.max_attendance_radius)                 errs.max_attendance_radius = "Maksimum radius absensi tidak boleh kosong";
        if (!data.check_in_start)                        errs.check_in_start        = "Jam buka absensi masuk tidak boleh kosong";
        if (!data.check_in_end)                          errs.check_in_end          = "Jam tutup absensi masuk tidak boleh kosong";
        if (!data.check_out_start)                       errs.check_out_start       = "Jam buka absensi pulang tidak boleh kosong";
        if (!data.check_out_end)                         errs.check_out_end         = "Jam tutup absensi pulang tidak boleh kosong";
        setError(errs);
        return Object.keys(errs).length === 0;
    };

    const submitForm = () => {
        post("/admin/app-setting/update", {
            preserveScroll: true,
            preserveState:  true,
            onSuccess: () => {
                BlastSonner({ message: "Pengaturan berhasil disimpan", type: BlastType.SUCCESS });
                setTimeout(() => window.location.reload(), 1000);
            },
            onError: () => {
                BlastSonner({ message: "Gagal menyimpan pengaturan", type: BlastType.ERROR });
            },
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateForm()) { clearErrors(); submitForm(); }
    };

    return (
        <MainLayout title={title}>
            <PageTitle
                title={title}
                description="Pengaturan Sistem Absensi Digital Prakerin SMK Agung Mulia"
            />
            <form onSubmit={handleSubmit}>

                {/* ── Status Sistem ── */}
                <div className="mb-5">
                    <h3 className="text-base font-semibold text-gray-700 mb-3">Status Sistem</h3>
                    <div className="flex flex-col gap-3">
                        <SystemToggle
                            label="Sistem Siswa"
                            description="Mengontrol akses seluruh fitur untuk siswa (Absensi, Jurnal, Dashboard)"
                            isActive={studentActive}
                            onToggle={() => handleToggleSystem("student")}
                            loading={toggleLoading}
                        />
                        <SystemToggle
                            label="Sistem Pembimbing"
                            description="Mengontrol akses seluruh fitur untuk Pembimbing"
                            isActive={supervisorActive}
                            onToggle={() => handleToggleSystem("supervisor")}
                            loading={toggleLoading}
                        />
                    </div>
                </div>

                <Separator className="my-5 h-1 rounded-full bg-blue-200" />

                {/* ── Nama Aplikasi ── */}
                <div className="mb-5">
                    <div className="flex flex-col">
                        <label className="text-base mb-1">Nama Aplikasi</label>
                        <Input
                            type="text"
                            placeholder="Masukkan Nama Aplikasi"
                            value={data.app_name}
                            onChange={(e) => setData("app_name", e.target.value)}
                            className={`py-6 ${errors.app_name ? "border-red-500" : ""}`}
                        />
                        {errors.app_name && <ErrorInput error={errors.app_name} />}
                    </div>
                </div>

                {/* ── Ikon Aplikasi ── */}
                <div className="mb-5">
                    <div className="flex flex-col">
                        <label className="text-base mb-1">Ikon Aplikasi</label>
                        <FilePond
                            files={appIconPond}
                            onupdatefiles={(fileItems) => {
                                handleIcon("app_icon", fileItems.length > 0 ? fileItems[0].file as File : null);
                                setAppIconPond(fileItems.map((item) => item.file));
                            }}
                            allowImagePreview={true}
                            allowMultiple={false}
                            acceptedFileTypes={["image/jpeg", "image/png"]}
                            labelIdle='<span class="filepond--label-action">Cari File Gambar</span>'
                        />
                        {errors.app_icon && <ErrorInput error={errors.app_icon} />}
                    </div>
                </div>

                <Separator className="my-5 h-1 rounded-full bg-blue-200" />

                {/* ── Nama Sekolah ── */}
                <div className="mb-5">
                    <div className="flex flex-col">
                        <label className="text-base mb-1">Nama Sekolah</label>
                        <Input
                            type="text"
                            placeholder="Masukkan Nama Sekolah"
                            value={data.school_name}
                            onChange={(e) => setData("school_name", e.target.value)}
                            className={`py-6 ${errors.school_name ? "border-red-500" : ""}`}
                        />
                        {errors.school_name && <ErrorInput error={errors.school_name} />}
                    </div>
                </div>

                {/* ── Logo Sekolah ── */}
                <div className="mb-5">
                    <div className="flex flex-col">
                        <label className="text-base mb-1">Logo Sekolah</label>
                        <FilePond
                            files={schoolIconPond}
                            onupdatefiles={(fileItems) => {
                                handleIcon("school_icon", fileItems.length > 0 ? fileItems[0].file as File : null);
                                setSchoolIconPond(fileItems.map((item) => item.file));
                            }}
                            allowImagePreview={true}
                            allowMultiple={false}
                            acceptedFileTypes={["image/jpeg", "image/png"]}
                            labelIdle='<span class="filepond--label-action">Cari File Gambar</span>'
                        />
                        {errors.school_icon && <ErrorInput error={errors.school_icon} />}
                    </div>
                </div>

                {/* ── Email & Telepon ── */}
                <div className="flex mb-5 w-full gap-3 items-center">
                    <div className="w-full flex flex-col">
                        <label className="text-base mb-1">Email Sekolah</label>
                        <Input
                            type="email"
                            placeholder="Masukkan Email Sekolah"
                            value={data.school_email}
                            onChange={(e) => setData("school_email", e.target.value)}
                            className={`py-6 ${errors.school_email ? "border-red-500" : ""}`}
                        />
                        {errors.school_email && <ErrorInput error={errors.school_email} />}
                    </div>
                    <div className="w-full flex flex-col">
                        <label className="text-base mb-1">No. Telepon Sekolah</label>
                        <Input
                            type="tel"
                            placeholder="Masukkan No Telepon Sekolah"
                            value={data.school_phone}
                            onChange={(e) => setData("school_phone", e.target.value)}
                            className={`py-6 ${errors.school_phone ? "border-red-500" : ""}`}
                        />
                        {errors.school_phone && <ErrorInput error={errors.school_phone} />}
                    </div>
                </div>

                {/* ── Alamat Sekolah ── */}
                <div className="mb-5">
                    <div className="flex flex-col">
                        <label className="text-base mb-1">Alamat Sekolah</label>
                        <Textarea
                            placeholder="Masukkan Alamat Sekolah"
                            value={data.school_address}
                            onChange={(e) => setData("school_address", e.target.value)}
                            rows={3}
                            className={`resize-none ${errors.school_address ? "border-red-500" : ""}`}
                        />
                        {errors.school_address && <ErrorInput error={errors.school_address} />}
                    </div>
                </div>

                {/* ── Website ── */}
                <div className="mb-5">
                    <div className="flex flex-col">
                        <label className="text-base mb-1">Website Sekolah</label>
                        <Input
                            type="text"
                            placeholder="Masukkan Website Sekolah"
                            value={data.school_website}
                            onChange={(e) => setData("school_website", e.target.value)}
                            className={`py-6 ${errors.school_website ? "border-red-500" : ""}`}
                        />
                        {errors.school_website && <ErrorInput error={errors.school_website} />}
                    </div>
                </div>

                <Separator className="my-5 h-1 rounded-full bg-blue-200" />

                {/* ── Lokasi ── */}
                <div className="mb-5">
                    <div className="flex flex-col">
                        <label className="text-base mb-1">Lokasi Default (Untuk Preview Map)</label>
                        <Input
                            type="url"
                            placeholder="Masukkan URL Pendek Google Maps"
                            onChange={(e) => debounceRevereseLocation(e.target.value)}
                            className={`py-6 mb-3 ${errors.default_latitude || errors.default_longitude ? "border-red-500" : ""}`}
                        />
                        <div className="flex gap-4 items-center">
                            <div className="w-full">
                                <label className="text-sm mb-1">Latitude</label>
                                <Input
                                    type="text"
                                    disabled={onReversingMaps}
                                    placeholder="Masukkan Latitude"
                                    onChange={(e) => handleLatLang("default_latitude", parseFloat(e.target.value))}
                                    value={onReversingMaps ? "Menyesuaikan Latitude" : data.default_latitude}
                                    className={`py-3 text-sm ${errors.default_latitude ? "border-red-500" : ""}`}
                                />
                                {errors.default_latitude && <ErrorInput error={errors.default_latitude} />}
                            </div>
                            <div className="w-full">
                                <label className="text-sm mb-1">Longitude</label>
                                <Input
                                    type="text"
                                    disabled={onReversingMaps}
                                    placeholder="Masukkan Longitude"
                                    onChange={(e) => handleLatLang("default_longitude", parseFloat(e.target.value))}
                                    value={onReversingMaps ? "Menyesuaikan Longitude" : data.default_longitude}
                                    className={`py-3 text-sm ${errors.default_longitude ? "border-red-500" : ""}`}
                                />
                                {errors.default_longitude && <ErrorInput error={errors.default_longitude} />}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Preview Map ── */}
                <div className="mb-5">
                    <div className="flex flex-col">
                        <label className="text-base mb-1">Preview Map</label>
                        <div className="relative overflow-hidden">
                            {onReversingMaps && (
                                <div className="absolute z-[10] rounded-lg h-full w-full bg-slate-50/50">
                                    <div className="flex flex-col gap-3 items-center justify-center h-full">
                                        <FiLoader className="animate-spin" size={64} />
                                        <h3>Menyesuaikan koordinat</h3>
                                    </div>
                                </div>
                            )}
                            <MapPicker
                                readonly={onReversingMaps}
                                latitude={data.default_latitude ?? undefined}
                                longitude={data.default_longitude ?? undefined}
                                onLocationPicked={(lat, lon) => {
                                    setData("default_latitude",  lat);
                                    setData("default_longitude", lon);
                                }}
                            />
                        </div>
                        {errors.default_latitude && errors.default_longitude && (
                            <ErrorInput error="Tentukan Koordinat Sekolah" />
                        )}
                    </div>
                </div>

                <Separator className="my-5 h-1 rounded-full bg-blue-200" />

                {/* ── Radius ── */}
                <div className="mb-5">
                    <div className="flex flex-col">
                        <label className="text-base mb-1">Maksimum Radius Absensi (Meter)</label>
                        <Input
                            type="number"
                            placeholder="Masukkan Radius"
                            value={data.max_attendance_radius}
                            onChange={(e) => setData("max_attendance_radius", parseInt(e.target.value))}
                            className={`py-6 ${errors.max_attendance_radius ? "border-red-500" : ""}`}
                        />
                        {errors.max_attendance_radius && <ErrorInput error={errors.max_attendance_radius} />}
                    </div>
                </div>

                <Separator className="my-5 h-1 rounded-full bg-blue-200" />

                {/* ══ Jam Absensi Per Jurusan ══════════════════════════════════════════════ */}
                <div className="mb-5">
                    <div className="mb-3">
                        <h3 className="text-base font-semibold text-gray-700">
                            Jam Absensi Per Jurusan
                        </h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Setiap jurusan memiliki sistem jam absensi yang berbeda.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 mb-5">
                        {/* TKJ — pakai global setting */}
                        <MajorTimeRow
                            major="TKJ (Teknik Komputer Jaringan)"
                            type="global"
                            badge="Jam Global"
                            badgeColor="bg-blue-100 text-blue-700"
                            checkInStart={data.check_in_start}
                            checkInEnd={data.check_in_end}
                            checkOutStart={data.check_out_start}
                            checkOutEnd={data.check_out_end}
                        />

                        {/* TSM — pakai global setting */}
                        <MajorTimeRow
                            major="TSM (Teknik Sepeda Motor)"
                            type="global"
                            badge="Jam Global"
                            badgeColor="bg-blue-100 text-blue-700"
                            checkInStart={data.check_in_start}
                            checkInEnd={data.check_in_end}
                            checkOutStart={data.check_out_start}
                            checkOutEnd={data.check_out_end}
                        />

                        {/* TBOG — pakai sistem shift */}
                        <MajorTimeRow
                            major="TBOG (Tata Boga)"
                            type="shift"
                            badge="Sistem Shift"
                            badgeColor="bg-purple-100 text-purple-700"
                        />
                    </div>

                    {/* ── Pengaturan Jam Global untuk TKJ & TSM ── */}
                    <div className="p-4 rounded-xl border border-blue-200 bg-blue-50">
                        <h4 className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-2">
                            <FiClock size={14} />
                            Atur Jam Global (TKJ & TSM)
                        </h4>

                        {/* Jam Absensi Masuk */}
                        <div className="mb-3 flex items-center gap-4">
                            <label className="text-sm w-full text-gray-700">Jam Absensi Masuk</label>
                            <div className="flex flex-col w-full">
                                <Input
                                    type="time"
                                    value={data.check_in_start}
                                    onChange={(e) => setData("check_in_start", e.target.value)}
                                    className={`py-3 text-sm bg-white ${errors.check_in_start ? "border-red-500" : ""}`}
                                />
                                {errors.check_in_start && <ErrorInput error={errors.check_in_start} />}
                            </div>
                            <span className="text-gray-400 text-sm shrink-0">s/d</span>
                            <div className="flex flex-col w-full">
                                <Input
                                    type="time"
                                    value={data.check_in_end}
                                    onChange={(e) => setData("check_in_end", e.target.value)}
                                    className={`py-3 text-sm bg-white ${errors.check_in_end ? "border-red-500" : ""}`}
                                />
                                {errors.check_in_end && <ErrorInput error={errors.check_in_end} />}
                            </div>
                        </div>

                        {/* Jam Absensi Pulang */}
                        <div className="flex items-center gap-4">
                            <label className="text-sm w-full text-gray-700">Jam Absensi Pulang</label>
                            <div className="flex flex-col w-full">
                                <Input
                                    type="time"
                                    value={data.check_out_start}
                                    onChange={(e) => setData("check_out_start", e.target.value)}
                                    className={`py-3 text-sm bg-white ${errors.check_out_start ? "border-red-500" : ""}`}
                                />
                                {errors.check_out_start && <ErrorInput error={errors.check_out_start} />}
                            </div>
                            <span className="text-gray-400 text-sm shrink-0">s/d</span>
                            <div className="flex flex-col w-full">
                                <Input
                                    type="time"
                                    value={data.check_out_end}
                                    onChange={(e) => setData("check_out_end", e.target.value)}
                                    className={`py-3 text-sm bg-white ${errors.check_out_end ? "border-red-500" : ""}`}
                                />
                                {errors.check_out_end && <ErrorInput error={errors.check_out_end} />}
                            </div>
                        </div>
                    </div>

                    {/* Info TBOG shift */}
                    <div className="mt-3 p-4 rounded-xl border border-purple-200 bg-purple-50">
                        <h4 className="text-sm font-semibold text-purple-700 mb-1 flex items-center gap-2">
                            <FiClock size={14} />
                            Pengaturan Shift TBOG
                        </h4>
                        <p className="text-sm text-purple-600 mb-3">
                            Jam absensi TBOG dikelola terpisah berdasarkan shift per lokasi hotel PKL.
                            Siswa TBOG memilih shift aktif setiap hari sebelum absen.
                        </p>
                        <Link href="/admin/shift">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border-purple-300 text-purple-700 hover:bg-purple-100 flex items-center gap-2"
                            >
                                <FiExternalLink size={14} />
                                Buka Halaman Manajemen Shift TBOG
                            </Button>
                        </Link>
                    </div>
                </div>

                <Separator className="my-5 h-1 rounded-full bg-blue-200" />

                {/* ── Submit ── */}
                <Button
                    type="submit"
                    className="w-full mt-4 p-6 bg-green-500 hover:bg-green-600"
                    disabled={processing}
                >
                    {processing ? (
                        <FiLoader className="animate-spin" />
                    ) : (
                        <span className="flex items-center gap-2">
                            <FiSave />
                            <span>Simpan Pengaturan</span>
                        </span>
                    )}
                </Button>
            </form>
        </MainLayout>
    );
}