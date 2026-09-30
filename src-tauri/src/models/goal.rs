use serde::{Deserialize, Serialize};

/// Muundo wa data wa Malengo ya Kila Siku (Daily Goal Data Model).
/// 
/// Dhana ya Rust:
/// Kila `struct` katika Rust inahifadhi kumbukumbu kwa mpangilio thabiti na madhubuti.
/// Tunatumia `String` (heap-allocated string) inayomilikiwa na struct hii badala ya
/// `&str` (borrowed string slice) ili kurahisisha umiliki wa data (Ownership).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Goal {
    pub id: String,
    pub title: String,
    pub completed: bool,
    pub date: String,       // Format ya tarehe: YYYY-MM-DD
    pub created_at: i64,    // Unix timestamp
}
