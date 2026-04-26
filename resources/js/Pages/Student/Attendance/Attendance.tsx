import BlastSonner, { BlastType } from "@/Components/custom/BlastSonner";
import { ErrorInput, SelectSearchInput } from "@/Components/custom/FormElement";
import KeyAndValue from "@/Components/custom/KeyAndValue";
import MapPicker from "@/Components/custom/MapPicker";
import { Button } from "@/Components/ui/button";
import { Textarea } from "@/Components/ui/textarea";
import { MainLayout } from "@/Layouts/MainLayout";
import MustActiveOnAttendance from "@/Pages/Permisson/MustActiveOnAttendance";
import { PageTitle } from "@/Partials/PageTitle";
import { ymdToIdDate } from "@/Services/additionalService";
import { Student } from "@/Types/student";
import { useForm } from "@inertiajs/react";
import React, { useCallback, useEffect, useState } from "react";
import { FiClock, FiLoader, FiSave } from "react-icons/fi";

// ─── Types ────────────────────────────────────────────────────────────────────

type ShiftOption = {
    value: string;
    label: string;
    check_in_start: string;
    check_in_end: string;
    check_out_start: string;
    check_out_end: string;
};

type StudentAttendanceCreateProps = {
    title: string;
    student: Student;
    max_radius: number;
    shifts: ShiftOption[];           // terisi jika TBOG, kosong jika TKJ/TSM
    is_shift_major: boolean;         // true = TBOG
    attendance_time_name: "MASUK" | "PULANG" | "DI LUAR WAKTU" | null;
    preselected_shift_id?: string | null; // dari Dashboard via URL param
    utm_source?: string;
};

// ─── Helper: hitung attendance_time dari shift yang dipilih ──────────────────

function getAttendanceTimeFromShift(
    shift: ShiftOption
): "MASUK" | "PULANG" | "DI LUAR WAKTU" {
    const now = new Date();
    const toMinutes = (timeStr: string) => {
        const [h, m] = timeStr.split(":").map(Number);
        return h * 60 + m;
    };
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const tolerance  = 15;

    const inStart  = toMinutes(shift.check_in_start)  - tolerance;
    const inEnd    = toMinutes(shift.check_in_end)     + tolerance;
    const outStart = toMinutes(shift.check_out_start)  - tolerance;
    let   outEnd   = toMinutes(shift.check_out_end)    + tolerance;

    // Handle overnight shift (misal check_out_end 23:00 → lewat tengah malam)
    if (outEnd < outStart) outEnd += 24 * 60;
    const nowAdjusted = nowMinutes < outStart && outEnd > 24 * 60
        ? nowMinutes + 24 * 60
        : nowMinutes;

    if (nowMinutes >= inStart && nowMinutes <= inEnd)       return "MASUK";
    if (nowAdjusted >= outStart && nowAdjusted <= outEnd)   return "PULANG";
    return "DI LUAR WAKTU";
}

// ─── ShiftTimeInfo — info jam shift yang dipilih ─────────────────────────────

function ShiftTimeInfo({ shift }: { shift: ShiftOption }) {
    const timeStatus = getAttendanceTimeFromShift(shift);
    const statusColor =
        timeStatus === "MASUK"  ? "text-green-600 bg-green-50 border-green-200" :
        timeStatus === "PULANG" ? "text-blue-600 bg-blue-50 border-blue-200"   :
                                  "text-red-500 bg-red-50 border-red-200";

    return (
        <div className={`mt-2 p-3 rounded-lg border text-sm flex flex-col gap-1 ${statusColor}`}>
            <div className="flex gap-4">
                <span>
                    🕐 Masuk: <strong>{shift.check_in_start}</strong> –{" "}
                    <strong>{shift.check_in_end}</strong>
                </span>
                <span>
                    🕐 Pulang: <strong>{shift.check_out_start}</strong> –{" "}
                    <strong>{shift.check_out_end}</strong>
                </span>
            </div>
            <span className="font-semibold">
                {timeStatus === "MASUK"  && "✅ Sekarang: Waktu Absen Masuk"}
                {timeStatus === "PULANG" && "✅ Sekarang: Waktu Absen Pulang"}
                {timeStatus === "DI LUAR WAKTU" && "⛔ Sekarang di Luar Window Absensi (toleransi ±15 menit)"}
            </span>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StudentAttendance({
    title,
    student,
    max_radius,
    shifts,
    is_shift_major,
    attendance_time_name,
    preselected_shift_id = null,
    utm_source = "",
}: StudentAttendanceCreateProps) {

    // Shift yang dipilih user — auto-select jika ada preselected_shift_id dari Dashboard
    const initialShift = preselected_shift_id
        ? (shifts.find((s) => s.value === preselected_shift_id) ?? null)
        : null;
    const [selectedShift, setSelectedShift] = useState<ShiftOption | null>(initialShift);

    // Untuk TBOG: attendance_time dihitung di frontend setelah shift dipilih
    // Untuk TKJ/TSM: langsung dari prop
    const currentAttendanceTime: "MASUK" | "PULANG" | "DI LUAR WAKTU" | null =
        is_shift_major
            ? (selectedShift ? getAttendanceTimeFromShift(selectedShift) : null)
            : attendance_time_name;

    const { data, setData, post, processing, errors, setError, clearErrors } =
        useForm({
            check_in:      new Date().toString(),
            check_out:     "",
            status:        "PRESENT",
            reason:        "",
            latitude_in:   0.0,
            longitude_in:  0.0,
            latitude_out:  0.0,
            longitude_out: 0.0,
            isInRadius:    false as boolean,
            shift_id:      preselected_shift_id ?? "" as string, // pre-fill dari Dashboard
            utm_source:    utm_source,
        });

    // ── Radius ───────────────────────────────────────────────────────────────

    const calculateDistance = (
        lat1: number, lng1: number,
        lat2: number, lng2: number
    ): number => {
        const toRad = (v: number) => (v * Math.PI) / 180;
        const R  = 6371e3;
        const φ1 = toRad(lat1), φ2 = toRad(lat2);
        const Δφ = toRad(lat2 - lat1), Δλ = toRad(lng2 - lng1);
        const a  = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const evaluateRadius = useCallback(() => {
        const latKey = currentAttendanceTime === "MASUK" ? "latitude_in"  : "latitude_out";
        const lngKey = currentAttendanceTime === "MASUK" ? "longitude_in" : "longitude_out";
        const lat    = data[latKey];
        const lng    = data[lngKey];
        const wsLat  = student?.workshop?.latitude;
        const wsLng  = student?.workshop?.longitude;

        if (!lat || !lng || !wsLat || !wsLng) {
            setData("isInRadius", false);
            setError(latKey, "radius out");
            setError(lngKey, "radius out");
            return;
        }

        const distance = calculateDistance(lat, lng, wsLat, wsLng);
        setData("isInRadius", distance <= max_radius);
        if (distance > max_radius) {
            setError(latKey, "radius out");
            setError(lngKey, "radius out");
        }
    }, [
        data.latitude_in, data.longitude_in,
        data.latitude_out, data.longitude_out,
        student, max_radius, currentAttendanceTime,
    ]);

    useEffect(() => {
        if (data.status === "PRESENT") {
            evaluateRadius();
        } else {
            setData("isInRadius", true);
            clearErrors("latitude_in");
            clearErrors("longitude_in");
            clearErrors("latitude_out");
            clearErrors("longitude_out");
        }
    }, [
        data.status,
        data.latitude_in, data.longitude_in,
        data.latitude_out, data.longitude_out,
        evaluateRadius,
    ]);

    const handleLocationChange = useCallback(
        (lat: number, lng: number) => {
            if (currentAttendanceTime === "MASUK") {
                setData("latitude_in",  lat);
                setData("longitude_in", lng);
            } else {
                setData("latitude_out",  lat);
                setData("longitude_out", lng);
            }
        },
        [setData, currentAttendanceTime]
    );

    // ── Shift selection (TBOG) ────────────────────────────────────────────────

    const handleShiftChange = (value: string) => {
        setData("shift_id", value);
        const found = shifts.find((s) => s.value === value) ?? null;
        setSelectedShift(found);
        clearErrors("shift_id" as any);
    };

    // ── Submit ────────────────────────────────────────────────────────────────

    const validateForm = (): boolean => {
        let hasError = false;

        if (is_shift_major && !data.shift_id) {
            setError("shift_id" as any, "Pilih shift terlebih dahulu");
            hasError = true;
        }

        if (!data.status) {
            setError("status", "Status tidak boleh kosong");
            hasError = true;
        }

        return hasError;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateForm()) return;

        // Jika TBOG dan waktu di luar window shift, block di frontend
        if (is_shift_major && selectedShift) {
            const time = getAttendanceTimeFromShift(selectedShift);
            if (time === "DI LUAR WAKTU") {
                BlastSonner({
                    type: BlastType.ERROR,
                    message: `Bukan waktu absen untuk ${selectedShift.label.split("—")[1]?.trim()}. Toleransi ±15 menit.`,
                });
                return;
            }
        }

        clearErrors();
        post("/student/attendance", {
            preserveScroll: true,
            replace: true,
            onError: (errors) => {
                BlastSonner({ type: BlastType.ERROR, message: errors.message });
            },
            onFinish: () => clearErrors(),
        });
    };

    // ── Derived label ─────────────────────────────────────────────────────────

    const pageAttendanceLabel =
        currentAttendanceTime === "MASUK"  ? "Masuk"  :
        currentAttendanceTime === "PULANG" ? "Pulang" : "";

    const isOutsideTime = currentAttendanceTime === "DI LUAR WAKTU";
    const isWaitingShift = is_shift_major && !selectedShift;

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <MustActiveOnAttendance onLocationChange={handleLocationChange}>
            <MainLayout title={`${title}${pageAttendanceLabel ? ` ${pageAttendanceLabel}` : ""}`}>
                <PageTitle
                    title={`${title}${pageAttendanceLabel ? ` ${pageAttendanceLabel}` : ""}`}
                    description="Absensi tepat waktu"
                />

                <form onSubmit={handleSubmit}>

                    {/* ── Info Siswa ── */}
                    <div className="mb-5">
                        <KeyAndValue
                            keyIdentifier="Lokasi Prakerin"
                            value={student?.workshop?.name}
                        />
                        <KeyAndValue
                            keyIdentifier="Tanggal & Waktu"
                            value={ymdToIdDate(data.check_in.toString(), true)}
                        />
                    </div>

                    {/* ── Pilih Shift (khusus TBOG) ── */}
                    {is_shift_major && (
                        <div className="mb-5">
                            <label className="text-base mb-1 flex items-center gap-2">
                                <FiClock size={16} />
                                Pilih Shift Hari Ini
                            </label>
                            <SelectSearchInput
                                value={data.shift_id}
                                options={shifts}
                                onChange={(value) => handleShiftChange(value.toString())}
                                placeholder="Pilih shift yang sedang aktif"
                                removeValue={() => {
                                    setData("shift_id", "");
                                    setSelectedShift(null);
                                }}
                            />
                            {(errors as any).shift_id && (
                                <ErrorInput error={(errors as any).shift_id} />
                            )}

                            {/* Info jam shift yang dipilih */}
                            {selectedShift && (
                                <ShiftTimeInfo shift={selectedShift} />
                            )}

                            {/* Pesan jika belum pilih shift */}
                            {!selectedShift && (
                                <p className="text-sm text-gray-400 mt-2 flex items-center gap-1">
                                    <FiClock size={13} />
                                    Pilih shift untuk melihat window waktu absensimu
                                </p>
                            )}
                        </div>
                    )}

                    {/* ── Pesan di luar waktu (TKJ/TSM) ── */}
                    {!is_shift_major && isOutsideTime && (
                        <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                            ⛔ Sekarang bukan waktu absensi. Silakan absen sesuai jadwal yang telah ditentukan.
                        </div>
                    )}

                    {/* ── Status Absensi — tampil hanya saat waktu MASUK ── */}
                    {currentAttendanceTime === "MASUK" && (
                        <div className="mb-5">
                            <label className="text-base mb-1">Status Absensi</label>
                            <SelectSearchInput
                                value={data.status}
                                options={[
                                    { label: "Hadir", value: "PRESENT" },
                                    { label: "Izin",  value: "EXCUSED" },
                                ]}
                                onChange={(value) => setData("status", value.toString())}
                                placeholder="Pilih Status Absensi"
                                removeValue={() => setData("status", "PRESENT")}
                            />
                            {errors.status && <ErrorInput error={errors.status} />}
                        </div>
                    )}

                    {/* ── Alasan Izin ── */}
                    {data.status === "EXCUSED" && currentAttendanceTime === "MASUK" && (
                        <div className="mb-5">
                            <label className="text-base mb-1">Alasan Izin</label>
                            <Textarea
                                className="resize-none"
                                rows={4}
                                value={data.reason}
                                onChange={(e) => setData("reason", e.target.value)}
                            />
                        </div>
                    )}

                    {/* ── Peta lokasi — tampil jika sudah ada waktu absen ── */}
                    {currentAttendanceTime && !isOutsideTime && (
                        <div className="mb-5">
                            <label className="text-base mb-1">
                                Lokasi Terkini Siswa
                                {currentAttendanceTime && (
                                    <span className={`ml-2 text-sm font-medium px-2 py-0.5 rounded-full ${
                                        currentAttendanceTime === "MASUK"
                                            ? "bg-green-100 text-green-700"
                                            : "bg-blue-100 text-blue-700"
                                    }`}>
                                        Absen {currentAttendanceTime}
                                    </span>
                                )}
                            </label>
                            <MapPicker
                                attendance_mode={true}
                                workshop_latitude={student?.workshop?.latitude ?? undefined}
                                workshop_longitude={student?.workshop?.longitude ?? undefined}
                                readonly={true}
                                latitude={
                                    currentAttendanceTime === "MASUK"
                                        ? data.latitude_in  ?? undefined
                                        : data.latitude_out ?? undefined
                                }
                                longitude={
                                    currentAttendanceTime === "MASUK"
                                        ? data.longitude_in  ?? undefined
                                        : data.longitude_out ?? undefined
                                }
                            />
                            {!data.isInRadius && (
                                <ErrorInput error="Kamu terlalu jauh dari Lokasi Prakerin" />
                            )}
                        </div>
                    )}

                    {/* ── Submit ── */}
                    <Button
                        type="submit"
                        className="w-full mt-4 p-6 bg-blue-500 hover:bg-blue-600"
                        disabled={
                            processing ||
                            isWaitingShift ||
                            isOutsideTime ||
                            (!data.isInRadius && data.status === "PRESENT")
                        }
                    >
                        {processing ? (
                            <FiLoader className="animate-spin" />
                        ) : isWaitingShift ? (
                            <span className="flex items-center gap-2">
                                <FiClock />
                                <span>Pilih Shift Dulu</span>
                            </span>
                        ) : isOutsideTime ? (
                            <span>⛔ Di Luar Waktu Absensi</span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <FiSave />
                                <span>Absen {pageAttendanceLabel}</span>
                            </span>
                        )}
                    </Button>
                </form>
            </MainLayout>
        </MustActiveOnAttendance>
    );
}