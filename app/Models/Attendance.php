<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Attendance extends Model
{
    const ALLOWED_STATUSES = [
        'PRESENT',
        'ABSENT',
        'EXCUSED',
    ];
    const PRESENT = 'PRESENT';
    const ABSENT = 'ABSENT';
    const EXCUSED = 'EXCUSED';
    const ATTENDANCE_REMINDER_TOPIC = 'attendance_reminder';
    protected $guarded = ['id'];

    public function student(){
        return $this->belongsTo(Student::class);
    }

    public function shift(): BelongsTo
    {
        return $this->belongsTo(Shift::class);
    }
}
