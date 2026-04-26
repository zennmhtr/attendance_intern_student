import { Card } from "@/Components/ui/card";
import { MainLayout } from "@/Layouts/MainLayout";
import {
    currentTimeCode,
    currentTimeGreeting,
    setLocalStorage,
    ymdToIdDate,
} from "@/Services/additionalService";
import { PiStudentFill } from "react-icons/pi";
import { FaUserGear } from "react-icons/fa6";
import { HiBuildingStorefront } from "react-icons/hi2";
import clsx from "clsx";
import { ApexBarChart, ChartNoData } from "@/Components/custom/Charts";
import { RiAdminLine } from "react-icons/ri";
import { useEffect, useState } from "react";
import { Clock8 } from "lucide-react";
import {
    DashboardMenuItemWithData,
    TableListInDashboard,
} from "@/Components/custom/MenuListInDashboard";
import { Attendance } from "@/Types/attendance";

type AdminDashboardProps = {
    title?: string;
    data: {
        user_role: string;
        default_location: {
            latitude: number;
            longitude: number;
        };
        cards: {
            student_count: number;
            workshop_count: number;
            supervisor_count: number;
        };
        charts: {
            attendances: {
                month: string;
                present: number;
                excused: number;
                absent: number;
            }[];
        };
        lists: {
            latest_attendances: Attendance[];
        };
    };
};

const StatusBadge = ({ status }: { status: string }) => {
    const statusConfig: Record<
        string,
        {
            label: string;
            bgColor: string;
            textColor: string;
            borderColor: string;
        }
    > = {
        PRESENT: {
            label: "HADIR",
            bgColor: "bg-green-100",
            textColor: "text-green-800",
            borderColor: "border-green-300",
        },
        EXCUSED: {
            label: "IZIN",
            bgColor: "bg-yellow-100",
            textColor: "text-yellow-800",
            borderColor: "border-yellow-300",
        },
        ABSENT: {
            label: "ALPHA",
            bgColor: "bg-red-100",
            textColor: "text-red-800",
            borderColor: "border-red-300",
        },
    };

    const config = statusConfig[status] || statusConfig.ABSENT;

    return (
        <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${config.bgColor} ${config.textColor} ${config.borderColor}`}
        >
            {config.label}
        </span>
    );
};

export default function AdminDashboard({ title, data }: AdminDashboardProps) {
    const [currentTime, setCurrentTime] = useState(new Date().toISOString());

    setLocalStorage("user_role", data.user_role);
    setLocalStorage("default_latitude", data.default_location.latitude);
    setLocalStorage("default_longitude", data.default_location.longitude);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date().toISOString());
        }, 60000);

        return () => clearInterval(interval);
    }, []);

    const attendance = {
        categories: data?.charts?.attendances?.map(
            (attendance) => attendance.month
        ),
        series: [
            {
                name: "Hadir",
                data: data?.charts?.attendances?.map(
                    (attendance) => attendance.present
                ),
            },
            {
                name: "Izin",
                data: data?.charts?.attendances?.map(
                    (attendance) => attendance.excused
                ),
            },
            {
                name: "Alpha",
                data: data?.charts?.attendances?.map(
                    (attendance) => attendance.absent
                ),
            },
        ],
    };

    const chartColors = ["#22C55E", "#EAB308", "#EF4444"];

    return (
        <>
            <MainLayout title={title}>
                <div className="w-full">
                    <div className="absolute top-0 left-0 w-full h-24 bg-blue-500 opacity-30 rounded-b-full z-0"></div>
                    <div className="z-10 relative mb-3 py-3">
                        <Card className="flex p-3 flex-row w-full relative overflow-hidden shadow-md">
                            <div
                                className={clsx(
                                    "absolute -right-5 -bottom-0 w-2/3 h-full bg-gradient-to-r from-white",
                                    currentTimeCode() === "M" && "to-[#FFF8DC]",
                                    currentTimeCode() === "A" &&
                                        "to-[#B0E0E6]",
                                    currentTimeCode() === "E" &&
                                        "to-[#FFDAB9]",
                                    currentTimeCode() === "N" && "to-[#778899]"
                                )}
                            ></div>
                            <div className="flex items-center mx-6 justify-center overflow-hidden relative">
                                <div className="rounded-full p-4 bg-blue-100">
                                    <RiAdminLine
                                        className="text-blue-600"
                                        size={35}
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col justify-center relative">
                                <h1 className="text-xl font-bold text-gray-800">
                                    Selamat {currentTimeGreeting()}
                                </h1>
                                <p className="text-lg text-gray-600">Administrator</p>
                            </div>
                        </Card>
                    </div>
                    <div className="z-10 relative mb-3 pb-3">
                        <Card className="flex p-3 flex-row w-full relative overflow-hidden shadow-md">
                            <div
                                className={clsx(
                                    "absolute -right-5 -bottom-0 w-2/3 h-full bg-gradient-to-r from-white",
                                    currentTimeCode() === "M" && "to-[#FFF8DC]",
                                    currentTimeCode() === "A" &&
                                        "to-[#B0E0E6]",
                                    currentTimeCode() === "E" &&
                                        "to-[#FFDAB9]",
                                    currentTimeCode() === "N" && "to-[#778899]"
                                )}
                            ></div>
                            <div
                                className={clsx(
                                    "z-10 absolute -right-5 -bottom-5 opacity-50",
                                    currentTimeCode() === "M" &&
                                        "text-[#8B8000]",
                                    currentTimeCode() === "A" &&
                                        "text-[#5F9EA0]",
                                    currentTimeCode() === "E" &&
                                        "text-[#CD5C5C]",
                                    currentTimeCode() === "N" &&
                                        "text-[#2F4F4F]"
                                )}
                            >
                                <Clock8 size={80} />
                            </div>
                            <div className="relative z-10 p-1">
                                <h3 className="font-semibold text-gray-600">
                                    Waktu Sekarang
                                </h3>
                                <span>
                                    <b>{ymdToIdDate(currentTime, true)}</b>
                                </span>
                            </div>
                        </Card>
                    </div>
                    <div className="mt-3">
                        <div className="mb-6 grid grid-cols-2 md:grid-cols-3 gap-3">
                            <DashboardMenuItemWithData
                                label="Jumlah Siswa"
                                value={data?.cards?.student_count.toString()}
                                icon={<PiStudentFill size={80} />}
                                url="/admin/student"
                            />
                            <DashboardMenuItemWithData
                                label="Jumlah Lokasi"
                                value={data?.cards?.workshop_count.toString()}
                                icon={<HiBuildingStorefront size={80} />}
                                url="/admin/workshop"
                            />
                            <DashboardMenuItemWithData
                                label="Jumlah Pembimbing"
                                value={data?.cards?.supervisor_count.toString()}
                                icon={<FaUserGear size={80} />}
                                url="/admin/supervisor"
                                className="col-span-2 md:col-span-1"
                            />
                        </div>
                        <div className="mb-5">
                            {data?.charts?.attendances.every(
                                (attendance) =>
                                    attendance.present === 0 &&
                                    attendance.excused == 0 &&
                                    attendance.absent == 0
                            ) ? (
                                <ChartNoData title="Rekap Kehadiran" />
                            ) : (
                                <ApexBarChart
                                    title="Rekap Kehadiran"
                                    description="Rekap kehadiran siswa dalam 3 bulan"
                                    categories={attendance.categories}
                                    series={attendance.series}
                                    colors={chartColors}
                                    height={300}
                                />
                            )}
                        </div>
                        <div className="mb-5">
                            <TableListInDashboard
                                title="Absensi Terbaru"
                                description="5 absensi terbaru yang tercatat"
                                headers={[
                                    "Nama Siswa",
                                    "Tanggal",
                                    "Waktu",
                                    "Status",
                                ]}
                                headerAlign="center"
                                cellAlign="center"
                                columnsData={data?.lists?.latest_attendances.map(
                                    (attendance) => [
                                        `${attendance.student?.nis} - ${attendance.student?.full_name}`,
                                        ymdToIdDate(attendance.check_in),
                                        ymdToIdDate(
                                            attendance.check_in,
                                            true,
                                            true
                                        ),
                                        <StatusBadge
                                            key={attendance.id}
                                            status={attendance.status}
                                        />,
                                    ]
                                )}
                            />
                        </div>
                    </div>
                </div>
            </MainLayout>
        </>
    );
}