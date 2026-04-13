// định nghĩa cấu trúc dữ liệu mapping chính xác với object từ frontend

#[derive(Debug, Serialize, Deserialize)]
pub struc CliCommand{
    name: String,
    command: String
}