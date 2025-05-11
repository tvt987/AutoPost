// // Xử lý dán ảnh từ clipboard (dùng trên comment.ejs)
// const imagePasteZone = document.getElementById('imagePasteZone');
// const imagePreview = document.getElementById('imagePreview');
// let pastedImages = [];

// imagePasteZone.addEventListener('paste', function(e) {
//     const items = (e.clipboardData || window.clipboardData).items;
//     for (const item of items) {
//         if (item.type.indexOf('image') !== -1) {
//             const file = item.getAsFile();
//             pastedImages.push(file);
//             const reader = new FileReader();
//             reader.onload = function(evt) {
//                 const img = document.createElement('img');
//                 img.src = evt.target.result;
//                 imagePreview.appendChild(img);
//             };
//             reader.readAsDataURL(file);
//         }
//     }
// });

// // Khi submit form, đính kèm ảnh vào FormData
// const commentForm = document.getElementById('commentForm');
// commentForm.addEventListener('submit', function(e) {
//     if (pastedImages.length > 0) {
//         e.preventDefault();
//         const formData = new FormData(commentForm);
//         pastedImages.forEach((file, idx) => {
//             formData.append('images', file, file.name || `clipboard${idx}.png`);
//         });
//         fetch('/comment', {
//             method: 'POST',
//             body: formData
//         }).then(res => res.json())
//           .then(data => {
//             alert(data.message || 'Đã gửi comment!');
//             window.location.href = '/';
//           });
//     }
// });
