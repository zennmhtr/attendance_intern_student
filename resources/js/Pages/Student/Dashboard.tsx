import MenuListInDashboard from "@/Components/custom/MenuListInDashboard";
import { SelectSearchInput } from "@/Components/custom/FormElement";
import { Card } from "@/Components/ui/card";
import { MainLayout } from "@/Layouts/MainLayout";
import {
    currentTimeCode,
    currentTimeGreeting,
    distanceConverter,
    isWithinTimeRange,
    requestNotificationPermission,
    setLocalStorage,
    ymdToIdDate,
} from "@/Services/additionalService";
import { MenuItem } from "@/Types/menu";
import { Student } from "@/Types/student";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { PiStudentFill } from "react-icons/pi";
import { LuMapPinCheck } from "react-icons/lu";
import {
    Ban,
    Bell,
    ChevronRight,
    ClipboardCheck,
    Clock8,
    Hourglass,
    MapPinCheck,
    NotebookText,
} from "lucide-react";
import { FiClock } from "react-icons/fi";
import { Link, usePage } from "@inertiajs/react";
import BlastSonner, { BlastType } from "@/Components/custom/BlastSonner";
import { HiBuildingStorefront } from "react-icons/hi2";
import { Attendance } from "@/Types/attendance";
import { Journal } from "@/Types/journal";

type GlobalSetting = {
    check_in_start: string;
    check_in_end: string;
    check_out_start: string;
    check_out_end: string;
    default_latitude: string | number;
    default_longitude: string | number;
    [key: string]: any;
};

type ShiftOption = {
    id: number;
    value: string;
    label: string;
    name: string;
    location: string;
    check_in_start: string;
    check_in_end: string;
    check_out_start: string;
    check_out_end: string;
};

type StudentWithPhoto = Student & {
    profile_photo_url?: string | null;
};

type StudentDashboardProps = {
    title?: string;
    student: StudentWithPhoto;
    user_role: string;
    latest_activity: {
        attendance?: Attendance;
        journal?: Journal;
    };
    setting: GlobalSetting;
    is_shift_major: boolean;   // true = TBOG
    shifts: ShiftOption[];     // [] jika TKJ/TSM
};

function getAttendanceTimeFromShift(
    shift: ShiftOption
): "MASUK" | "PULANG" | "DI LUAR WAKTU" {
    const now = new Date();
    const toMin = (t: string) => {
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m;
    };
    const nowMin   = now.getHours() * 60 + now.getMinutes();
    const tol      = 15;
    const inStart  = toMin(shift.check_in_start)  - tol;
    const inEnd    = toMin(shift.check_in_end)     + tol;
    const outStart = toMin(shift.check_out_start)  - tol;
    let   outEnd   = toMin(shift.check_out_end)    + tol;
    if (outEnd < outStart) outEnd += 24 * 60;
    const nowAdj   = nowMin < outStart && outEnd > 24 * 60 ? nowMin + 24 * 60 : nowMin;

    if (nowMin >= inStart && nowMin <= inEnd)       return "MASUK";
    if (nowAdj >= outStart && nowAdj <= outEnd)     return "PULANG";
    return "DI LUAR WAKTU";
}

function ShiftInfoCard({ shift }: { shift: ShiftOption }) {
    const timeStatus = getAttendanceTimeFromShift(shift);

    const colorMap = {
        MASUK:           { bg: "to-green-100", icon: "text-green-400", badge: "bg-green-100 text-green-700" },
        PULANG:          { bg: "to-blue-100",  icon: "text-blue-400",  badge: "bg-blue-100 text-blue-700"  },
        "DI LUAR WAKTU": { bg: "to-red-100",   icon: "text-red-300",   badge: "bg-red-100 text-red-500"    },
    };
    const color = colorMap[timeStatus];

    return (
        <Card className="p-4 relative overflow-hidden shadow-md mb-3">
            <div className={`absolute -right-5 -bottom-0 w-2/3 h-full bg-gradient-to-r from-white ${color.bg} z-0`} />
            <FiClock className={`absolute z-10 -right-1 -bottom-2 opacity-40 ${color.icon}`} size={70} />
            <div className="z-10 flex flex-col justify-start items-start relative gap-1">
                <h3 className="font-semibold text-slate-700">
                    {shift.location} — {shift.name}
                </h3>
                <div className="flex gap-3 text-sm text-slate-600">
                    <span>🕐 Masuk: <strong>{shift.check_in_start}</strong> – <strong>{shift.check_in_end}</strong></span>
                    <span>🕐 Pulang: <strong>{shift.check_out_start}</strong> – <strong>{shift.check_out_end}</strong></span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 ${color.badge}`}>
                    {timeStatus === "MASUK"           && "✅ Sekarang: Waktu Absen Masuk"}
                    {timeStatus === "PULANG"          && "✅ Sekarang: Waktu Absen Pulang"}
                    {timeStatus === "DI LUAR WAKTU"   && "⛔ Di Luar Window Absensi (toleransi ±15 menit)"}
                </span>
            </div>
        </Card>
    );
}

function AbsensiCardTBOG({
    shifts,
    latest_activity,
    currentTime,
}: {
    shifts: ShiftOption[];
    latest_activity: StudentDashboardProps["latest_activity"];
    currentTime: string;
}) {
    const [selectedShift, setSelectedShift] = useState<ShiftOption | null>(null);

    const timeStatus = selectedShift
        ? getAttendanceTimeFromShift(selectedShift)
        : null;

    const alreadyCheckedIn  = latest_activity?.attendance != null;
    const alreadyCheckedOut = latest_activity?.attendance?.check_out != null;

    return (
        <div className="mb-3">
            <Card className="p-4 relative overflow-hidden shadow-md mb-3">
                <div className="absolute -right-5 -bottom-0 w-2/3 h-full bg-gradient-to-r from-white to-purple-50 z-0" />
                <FiClock className="absolute z-10 -right-1 -bottom-2 opacity-20 text-purple-400" size={70} />
                <div className="z-10 relative flex flex-col gap-2">
                    <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                        <FiClock size={16} className="text-purple-500" />
                        Pilih Shift Hari Ini
                    </h3>
                    <SelectSearchInput
                        value={selectedShift?.value ?? ""}
                        options={shifts}
                        onChange={(value) => {
                            const found = shifts.find((s) => s.value === value.toString()) ?? null;
                            setSelectedShift(found);
                        }}
                        placeholder="Pilih shift aktif kamu hari ini"
                        removeValue={() => setSelectedShift(null)}
                    />
                    {shifts.length === 0 && (
                        <p className="text-sm text-gray-400">
                            Tidak ada shift aktif untuk lokasi prakerin kamu saat ini.
                        </p>
                    )}
                </div>
            </Card>

            {selectedShift && <ShiftInfoCard shift={selectedShift} />}
            {!alreadyCheckedIn && selectedShift && timeStatus === "MASUK" && (
                <Link href={`/student/attendance/create?utm_source=student_dashboard&shift_id=${selectedShift.id}`}>
                    <Card className="p-4 relative overflow-hidden shadow-md mb-3">
                        <div className="absolute -right-5 -bottom-0 w-2/3 h-full bg-gradient-to-r from-white to-red-100 z-0" />
                        <ChevronRight className="absolute z-10 right-3 top-7 text-red-500" />
                        <div className="z-10 flex flex-col justify-start items-start relative">
                            <h3 className="font-semibold text-slate-700 mb-0">Absensi Masuk Sekarang</h3>
                            <span className="text-slate-700">Klik untuk absensi</span>
                        </div>
                    </Card>
                </Link>
            )}

            {alreadyCheckedIn && (
                <Card className="p-4 relative overflow-hidden shadow-md mb-3">
                    <div className="absolute -right-5 -bottom-0 w-2/3 h-full bg-gradient-to-r from-white to-[#FFFAF0] z-0" />
                    <MapPinCheck className="absolute z-10 -right-0 -bottom-3 text-[#b4a08e] opacity-70" size={90} />
                    <div className="z-10 flex flex-col justify-start items-start relative">
                        <h3 className="font-semibold text-slate-700 mb-0">
                            {latest_activity?.attendance?.status === "PRESENT" ? "Absensi Masuk" : "Absensi Izin"}
                        </h3>
                        <span className="text-slate-700">
                            {ymdToIdDate(latest_activity?.attendance?.check_in, true)}
                        </span>
                        <span className="text-slate-700">
                            Berjarak sekitar{" "}
                            <span className="font-semibold">
                                {distanceConverter(latest_activity?.attendance?.radius_gap_attendance_in as number)}
                            </span>
                            {" dari Lokasi Prakerin"}
                        </span>
                    </div>
                </Card>
            )}

            {alreadyCheckedIn &&
                latest_activity?.attendance?.status === "PRESENT" &&
                !alreadyCheckedOut &&
                selectedShift &&
                timeStatus === "PULANG" && (
                    <Link href={`/student/attendance/create?utm_source=student_dashboard&shift_id=${selectedShift.id}`}>
                        <Card className="p-4 relative overflow-hidden shadow-md mb-3">
                            <div className="absolute -right-5 -bottom-0 w-2/3 h-full bg-gradient-to-r from-white to-red-100 z-0" />
                            <ChevronRight className="absolute z-10 right-3 top-7 text-red-500" />
                            <div className="z-10 flex flex-col justify-start items-start relative">
                                <h3 className="font-semibold text-slate-700 mb-0">Absensi Pulang Sekarang</h3>
                                <span className="text-slate-700">Klik untuk absensi</span>
                            </div>
                        </Card>
                    </Link>
                )}

            {alreadyCheckedOut && (
                <Card className="p-4 relative overflow-hidden shadow-md mb-3">
                    <div className="absolute -right-5 -bottom-0 w-2/3 h-full bg-gradient-to-r from-white to-amber-100 opacity-50 z-0" />
                    <MapPinCheck className="absolute z-10 -right-0 -bottom-3 text-amber-500 opacity-50" size={90} />
                    <div className="z-10 flex flex-col justify-start items-start relative">
                        <h3 className="font-semibold text-slate-700 mb-0">Absensi Pulang</h3>
                        <span className="text-slate-700">
                            {ymdToIdDate(latest_activity?.attendance?.check_out, true)}
                        </span>
                        <span className="text-slate-700">
                            Berjarak sekitar{" "}
                            <span className="font-semibold">
                                {distanceConverter(latest_activity?.attendance?.radius_gap_attendance_out as number)}
                            </span>
                            {" dari Lokasi Prakerin"}
                        </span>
                    </div>
                </Card>
            )}

            {!selectedShift && !alreadyCheckedIn && (
                <Card className="p-4 relative overflow-hidden shadow-md mb-3 border-dashed border-2 border-gray-200">
                    <div className="z-10 flex flex-col justify-start items-start relative text-gray-400 text-sm">
                        <span>Pilih shift di atas untuk melihat status absensi kamu hari ini.</span>
                    </div>
                </Card>
            )}
        </div>
    );
}

function AbsensiCardGlobal({
    setting,
    latest_activity,
    currentTime,
}: {
    setting: GlobalSetting;
    latest_activity: StudentDashboardProps["latest_activity"];
    currentTime: string;
}) {
    const alreadyCheckedIn  = latest_activity?.attendance != null;
    const alreadyCheckedOut = latest_activity?.attendance?.check_out != null;

    return (
        <div className="mb-3">
            <Card className="p-4 relative overflow-hidden shadow-md mb-3">
                <div className="absolute -right-5 -bottom-0 w-2/3 h-full bg-gradient-to-r from-white to-blue-50 z-0" />
                <FiClock className="absolute z-10 -right-1 -bottom-2 opacity-20 text-blue-400" size={70} />
                <div className="z-10 relative flex flex-col gap-1">
                    <h3 className="font-semibold text-slate-700">Jadwal Absensi</h3>
                    <div className="flex gap-4 text-sm text-slate-600">
                        <span>🕐 Masuk: <strong>{setting.check_in_start}</strong> – <strong>{setting.check_in_end}</strong></span>
                        <span>🕐 Pulang: <strong>{setting.check_out_start}</strong> – <strong>{setting.check_out_end}</strong></span>
                    </div>
                </div>
            </Card>

            {!alreadyCheckedIn &&
                !isWithinTimeRange(setting.check_in_start, setting.check_in_end, currentTime) && (
                <Card className="p-4 relative overflow-hidden shadow-md mb-3">
                    <div className="absolute -right-5 -bottom-0 w-2/3 h-full bg-gradient-to-r from-white to-red-100 z-0" />
                    {new Date(currentTime) > new Date(`1970-01-01T${setting.check_in_end}`) ? (
                        <Ban className="absolute z-10 -right-4 -bottom-0 text-red-300" size={70} />
                    ) : (
                        <Hourglass className="absolute z-10 -right-0 -bottom-3 text-red-300" size={70} />
                    )}
                    <div className="z-10 flex flex-col justify-start items-start relative">
                        <h3 className="font-semibold text-slate-700 mb-0">Absensi Masuk</h3>
                        {new Date(currentTime) > new Date(`1970-01-01T${setting.check_in_end}`) ? (
                            <span className="text-slate-700">Kamu dianggap tidak masuk Prakerin hari ini.</span>
                        ) : (
                            <span className="text-slate-700">
                                Absensi dibuka pada Jam:{" "}
                                {parseInt(setting.check_in_start).toFixed(2)} –{" "}
                                {parseInt(setting.check_in_end).toFixed(2)}
                            </span>
                        )}
                    </div>
                </Card>
            )}

            {!alreadyCheckedIn &&
                isWithinTimeRange(setting.check_in_start, setting.check_in_end, currentTime) && (
                <Link href="/student/attendance/create?utm_source=student_dashboard">
                    <Card className="p-4 relative overflow-hidden shadow-md mb-3">
                        <div className="absolute -right-5 -bottom-0 w-2/3 h-full bg-gradient-to-r from-white to-red-100 z-0" />
                        <ChevronRight className="absolute z-10 right-3 top-7 text-red-500" />
                        <div className="z-10 flex flex-col justify-start items-start relative">
                            <h3 className="font-semibold text-slate-700 mb-0">Absensi Masuk Sekarang</h3>
                            <span className="text-slate-700">Klik untuk absensi</span>
                        </div>
                    </Card>
                </Link>
            )}

            {alreadyCheckedIn && (
                <Card className="p-4 relative overflow-hidden shadow-md mb-3">
                    <div className="absolute -right-5 -bottom-0 w-2/3 h-full bg-gradient-to-r from-white to-[#FFFAF0] z-0" />
                    <MapPinCheck className="absolute z-10 -right-0 -bottom-3 text-[#b4a08e] opacity-70" size={90} />
                    <div className="z-10 flex flex-col justify-start items-start relative">
                        <h3 className="font-semibold text-slate-700 mb-0">
                            {latest_activity?.attendance?.status === "PRESENT" ? "Absensi Masuk" : "Absensi Izin"}
                        </h3>
                        <span className="text-slate-700">
                            {ymdToIdDate(latest_activity?.attendance?.check_in, true)}
                        </span>
                        <span className="text-slate-700">
                            Berjarak sekitar{" "}
                            <span className="font-semibold">
                                {distanceConverter(latest_activity?.attendance?.radius_gap_attendance_in as number)}
                            </span>
                            {" dari Lokasi Prakerin"}
                        </span>
                    </div>
                </Card>
            )}

            {alreadyCheckedIn &&
                latest_activity?.attendance?.status === "PRESENT" &&
                !alreadyCheckedOut &&
                isWithinTimeRange(setting.check_out_start, setting.check_out_end, currentTime) && (
                <Link href="/student/attendance/create?utm_source=student_dashboard">
                    <Card className="p-4 relative overflow-hidden shadow-md mb-3">
                        <div className="absolute -right-5 -bottom-0 w-2/3 h-full bg-gradient-to-r from-white to-red-100 z-0" />
                        <ChevronRight className="absolute z-10 right-3 top-7 text-red-500" />
                        <div className="z-10 flex flex-col justify-start items-start relative">
                            <h3 className="font-semibold text-slate-700 mb-0">Absensi Pulang Sekarang</h3>
                            <span className="text-slate-700">Klik untuk absensi</span>
                        </div>
                    </Card>
                </Link>
            )}

            {alreadyCheckedOut && (
                <Card className="p-4 relative overflow-hidden shadow-md mb-3">
                    <div className="absolute -right-5 -bottom-0 w-2/3 h-full bg-gradient-to-r from-white to-amber-100 opacity-50 z-0" />
                    <MapPinCheck className="absolute z-10 -right-0 -bottom-3 text-amber-500 opacity-50" size={90} />
                    <div className="z-10 flex flex-col justify-start items-start relative">
                        <h3 className="font-semibold text-slate-700 mb-0">Absensi Pulang</h3>
                        <span className="text-slate-700">
                            {ymdToIdDate(latest_activity?.attendance?.check_out, true)}
                        </span>
                        <span className="text-slate-700">
                            Berjarak sekitar{" "}
                            <span className="font-semibold">
                                {distanceConverter(latest_activity?.attendance?.radius_gap_attendance_out as number)}
                            </span>
                            {" dari Lokasi Prakerin"}
                        </span>
                    </div>
                </Card>
            )}
        </div>
    );
}

export default function StudentDashboard({
    title,
    student,
    user_role,
    latest_activity,
    setting,
    is_shift_major,
    shifts,
}: StudentDashboardProps) {
    const { flash } = usePage().props as any;
    const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(
        student?.profile_photo_url || null
    );
    const [imgError, setImgError]       = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date().toISOString());
    const [grantedNotif, setGrantedNotif] = useState(
        Notification.permission === "granted"
    );

    useEffect(() => {
        setProfilePhotoUrl(student?.profile_photo_url || null);
        setImgError(false);
    }, [student?.profile_photo_url]);

    useEffect(() => {
        if (flash?.success) BlastSonner({ type: BlastType.SUCCESS, message: flash.success });
        if (flash?.error)   BlastSonner({ type: BlastType.ERROR,   message: flash.error   });
    }, [flash]);

    useEffect(() => {
        if (grantedNotif) requestNotificationPermission("student");
    }, [grantedNotif]);

    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date().toISOString()), 60000);
        return () => clearInterval(interval);
    }, []);

    setLocalStorage("user_role", user_role);
    setLocalStorage("default_latitude",  setting?.default_latitude);
    setLocalStorage("default_longitude", setting?.default_longitude);

    const menuItems: MenuItem[] = [
        { icon: <LuMapPinCheck size={24} color="#36454F" />, label: "Data Absensi",          url: "/student/attendance" },
        { icon: <NotebookText  size={24} color="#36454F" />, label: "Data Jurnal",            url: "/student/journal"   },
        { icon: <HiBuildingStorefront size={24} color="#36454F" />, label: "Lokasi Prakerin Kamu", url: "/student/workshop"  },
    ];

    const handleRequestNotification = async () => {
        const isGranted = await requestNotificationPermission("student");
        setGrantedNotif(isGranted);
        BlastSonner({
            message: isGranted ? "Notifikasi diizinkan" : "Notifikasi ditolak",
            type:    isGranted ? BlastType.SUCCESS : BlastType.ERROR,
        });
    };

    return (
        <MainLayout title={title as string}>
            <div className="w-full">
                <div className="absolute top-0 left-0 w-full h-24 bg-blue-500 opacity-30 rounded-b-full z-0" />
                <div className="z-10 relative py-3">
                    <Card className="flex p-3 flex-row w-full relative overflow-hidden shadow-md">
                        <div className={clsx("absolute -right-5 -bottom-0 w-2/3 h-full bg-gradient-to-r from-white",
                            currentTimeCode() === "M" && "to-[#FFF8DC]",
                            currentTimeCode() === "A" && "to-[#B0E0E6]",
                            currentTimeCode() === "E" && "to-[#FFDAB9]",
                            currentTimeCode() === "N" && "to-[#778899]"
                        )} />
                        <div className="flex items-center mx-6 justify-center overflow-hidden relative">
                            <div className="rounded-full w-14 h-14 bg-blue-100 flex items-center justify-center overflow-hidden shadow-md">
                                {profilePhotoUrl && !imgError ? (
                                    <img src={profilePhotoUrl} alt="Foto Profil"
                                        className="w-full h-full object-cover"
                                        onError={() => setImgError(true)} loading="eager" />
                                ) : (
                                    <PiStudentFill className="text-blue-600" size={40} />
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col justify-center relative">
                            <h1 className="text-xl font-bold text-gray-800">
                                Selamat {currentTimeGreeting()}
                            </h1>
                            <p className="text-lg text-gray-600 font-semibold">
                                {student?.full_name.split(" ").length === 3
                                    ? student.full_name.split(" ").slice(0, 2).join(" ")
                                    : student.full_name}
                            </p>
                            {/* Badge jurusan */}
                            {student?.major && (
                                <span className="text-xs mt-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 w-fit font-medium">
                                    {student.major}
                                    {is_shift_major && " · Sistem Shift"}
                                </span>
                            )}
                        </div>
                    </Card>
                </div>

                <div className="z-10 relative mb-3 pb-3">
                    <Card className="flex p-3 flex-row w-full relative overflow-hidden shadow-md">
                        <div className={clsx("absolute -right-5 -bottom-0 w-2/3 h-full bg-gradient-to-r from-white",
                            currentTimeCode() === "M" && "to-[#FFF8DC]",
                            currentTimeCode() === "A" && "to-[#B0E0E6]",
                            currentTimeCode() === "E" && "to-[#FFDAB9]",
                            currentTimeCode() === "N" && "to-[#778899]"
                        )} />
                        <div className={clsx("z-10 absolute -right-5 -bottom-5 opacity-50",
                            currentTimeCode() === "M" && "text-[#8B8000]",
                            currentTimeCode() === "A" && "text-[#5F9EA0]",
                            currentTimeCode() === "E" && "text-[#CD5C5C]",
                            currentTimeCode() === "N" && "text-[#2F4F4F]"
                        )}>
                            <Clock8 size={80} />
                        </div>
                        <div className="relative z-10 p-1">
                            <h3 className="font-semibold text-gray-700">Waktu Sekarang</h3>
                            <b><span>{ymdToIdDate(currentTime, true)}</span></b>
                        </div>
                    </Card>
                </div>

                {!grantedNotif && (
                    <div className="z-10 group relative mb-3 pb-3 cursor-pointer"
                        onClick={handleRequestNotification}>
                        <Card className="flex p-3 flex-row w-full relative overflow-hidden shadow-md">
                            <div className="absolute -right-5 -bottom-0 w-2/3 h-full bg-gradient-to-r from-white to-yellow-200/50" />
                            <div className="z-10 absolute right-1.5 bottom-2 opacity-50"><Bell size={35} /></div>
                            <div className="relative z-10 p-1">
                                <h3 className="font-medium group-hover:underline text-gray-700">
                                    Izinkan Notifikasi untuk pengingat absensi
                                </h3>
                            </div>
                        </Card>
                    </div>
                )}

                <MenuListInDashboard className="mb-6" menuItems={menuItems} />
                {is_shift_major ? (
                    <AbsensiCardTBOG
                        shifts={shifts}
                        latest_activity={latest_activity}
                        currentTime={currentTime}
                    />
                ) : (
                    <AbsensiCardGlobal
                        setting={setting}
                        latest_activity={latest_activity}
                        currentTime={currentTime}
                    />
                )}

                {latest_activity?.journal == null ? (
                    <div>
                        {(is_shift_major || new Date(currentTime) < new Date(`1970-01-01T${setting?.check_in_end}`)) && (
                            <Link href="/student/journal/create">
                                <Card className="p-4 relative overflow-hidden shadow-md">
                                    <div className="absolute -right-5 -bottom-0 w-2/3 h-full bg-gradient-to-r from-white to-red-100 z-0" />
                                    <ChevronRight className="absolute z-10 right-3 top-7 text-red-500" />
                                    <div className="z-10 flex flex-col justify-start items-start relative">
                                        <h3 className="font-semibold text-slate-700 mb-0">Jurnal Kegiatan hari ini</h3>
                                        <span className="text-slate-700">Klik untuk menambah jurnal</span>
                                    </div>
                                </Card>
                            </Link>
                        )}
                    </div>
                ) : (
                    <Card className="p-4 relative overflow-hidden shadow-md">
                        <div className="absolute -right-5 -bottom-0 w-2/3 h-full bg-gradient-to-r from-white to-blue-100 opacity-50 z-0" />
                        <ClipboardCheck className="absolute z-10 -right-0 -bottom-4 text-blue-500 opacity-50" size={90} />
                        <div className="z-10 flex flex-col justify-start items-start relative">
                            <h3 className="font-semibold text-slate-700 mb-0">Kamu sudah mengisi jurnal hari ini</h3>
                            <span className="text-slate-700">
                                {ymdToIdDate(latest_activity?.journal?.date.toString())}
                            </span>
                            <span className="text-slate-700"
                                dangerouslySetInnerHTML={{
                                    __html: latest_activity?.journal.activity?.length > 30
                                        ? `${latest_activity?.journal.activity.substring(0, 30)}...`
                                        : latest_activity?.journal.activity,
                                }}
                            />
                        </div>
                    </Card>
                )}
            </div>
        </MainLayout>
    );
}