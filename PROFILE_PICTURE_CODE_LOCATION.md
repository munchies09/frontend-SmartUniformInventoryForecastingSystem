# Profile Picture Code Location - Admin Member Page

## Current Picture Display Code (Lines 1089-1105)

Here's the exact code where the profile picture is displayed in the table:

```tsx
<td className="px-4 py-3">
  {member.profile.profilePicture ? (
    <img
      src={member.profile.profilePicture}
      alt={`${member.profile.name}'s profile picture`}
      className="w-12 h-12 rounded-full object-cover border-2 border-orange-300"
      onError={(e) => {
        // Fallback if image fails to load
        (e.target as HTMLImageElement).style.display = "none";
        (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
      }}
    />
  ) : (
    <div className="w-12 h-12 rounded-full bg-gray-200 border-2 border-orange-300 flex items-center justify-center">
      <span className="text-gray-400 text-xs">No Photo</span>
    </div>
  )}
</td>
```

## Location in File
- **File**: `src/app/admin/member/page.tsx`
- **Lines**: 1089-1105
- **Function**: Inside the `viewMode === "profile"` section of the table body

## How to Make it Editable

To make the picture clickable and editable, replace the code above with this:

```tsx
<td className="px-4 py-3">
  <div className="relative group">
    <label 
      htmlFor={`profile-picture-${member.profile.sispaId}`}
      className="cursor-pointer"
    >
      {member.profile.profilePicture ? (
        <img
          src={member.profile.profilePicture}
          alt={`${member.profile.name}'s profile picture`}
          className="w-12 h-12 rounded-full object-cover border-2 border-orange-300 hover:border-blue-500 transition"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
            (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
          }}
        />
      ) : (
        <div className="w-12 h-12 rounded-full bg-gray-200 border-2 border-orange-300 flex items-center justify-center hover:border-blue-500 transition cursor-pointer">
          <span className="text-gray-400 text-xs">Click to Upload</span>
        </div>
      )}
    </label>
    <input
      type="file"
      id={`profile-picture-${member.profile.sispaId}`}
      accept="image/*"
      className="hidden"
      onChange={(e) => handleProfilePictureUpload(e, member.profile.sispaId)}
    />
  </div>
</td>
```

## Required Function to Add

Add this function to handle the picture upload (add it near the `handleDeleteMember` function):

```tsx
const handleProfilePictureUpload = async (
  e: React.ChangeEvent<HTMLInputElement>,
  sispaId: string
) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith('image/')) {
    Swal.fire({
      icon: "error",
      title: "Invalid File",
      text: "Please select an image file.",
      confirmButtonColor: "#1d4ed8",
    });
    return;
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    Swal.fire({
      icon: "error",
      title: "File Too Large",
      text: "Please select an image smaller than 5MB.",
      confirmButtonColor: "#1d4ed8",
    });
    return;
  }

  try {
    const token = localStorage.getItem("token");
    if (!token) {
      Swal.fire({
        icon: "error",
        title: "Authentication Error",
        text: "Please login again.",
        confirmButtonColor: "#1d4ed8",
      });
      return;
    }

    // Convert image to base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Image = reader.result as string;

      try {
        // Update member profile picture
        const res = await fetch(`http://localhost:5000/api/members/${sispaId}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            profilePicture: base64Image,
          }),
        });

        const data = await res.json();

        if (data.success) {
          Swal.fire({
            icon: "success",
            title: "Updated!",
            text: "Profile picture updated successfully",
            confirmButtonColor: "#1d4ed8",
            timer: 2000,
          });

          // Refresh member list
          await fetchAllMembers();
        } else {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: data.message || "Failed to update profile picture",
            confirmButtonColor: "#1d4ed8",
          });
        }
      } catch (error) {
        console.error("Error updating profile picture:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Failed to update profile picture",
          confirmButtonColor: "#1d4ed8",
        });
      }
    };

    reader.readAsDataURL(file);
  } catch (error) {
    console.error("Error reading file:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Failed to read image file",
      confirmButtonColor: "#1d4ed8",
    });
  }
};
```

## Summary

1. **Current Code Location**: Lines 1089-1105 in `src/app/admin/member/page.tsx`
2. **What it does**: Displays the profile picture in a table cell
3. **How to make editable**: 
   - Replace the `<td>` content with the editable version above
   - Add the `handleProfilePictureUpload` function
   - The picture becomes clickable and allows file upload
