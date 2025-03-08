package controllers

import (
    "time"
    "fmt"
    "math"
)

// formatTimeAgo - zaman farkını insan tarafından okunabilir hale getirir
func formatTimeAgo(t time.Time) string {
    now := time.Now()
    diff := now.Sub(t)
    
    seconds := diff.Seconds()
    minutes := diff.Minutes()
    hours := diff.Hours()
    days := hours / 24
    
    if seconds < 60 {
        return "şimdi"
    } else if minutes < 60 {
        return fmt.Sprintf("%d dk önce", int(math.Floor(minutes)))
    } else if hours < 24 {
        return fmt.Sprintf("%d saat önce", int(math.Floor(hours)))
    } else if days < 7 {
        return fmt.Sprintf("%d gün önce", int(math.Floor(days)))
    } else if days < 30 {
        weeks := days / 7
        return fmt.Sprintf("%d hafta önce", int(math.Floor(weeks)))
    } else if days < 365 {
        months := days / 30
        return fmt.Sprintf("%d ay önce", int(math.Floor(months)))
    } else {
        years := days / 365
        return fmt.Sprintf("%d yıl önce", int(math.Floor(years)))
    }
}