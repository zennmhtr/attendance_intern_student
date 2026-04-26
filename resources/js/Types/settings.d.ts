export type GlobalSetting = {
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
}

export interface User {
    id: number;
    name: string;
    email: string;
    role: string;
}

export interface Workshop {
    id: number;
    name: string;
    owner_name: string;
    phone: string;
    address: string;
    latitude: number;
    longitude: number;
    supervisor_id: number | null;
}