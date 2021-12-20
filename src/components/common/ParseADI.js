export default function ParseADI(url) {
    let adi = url.replace("acc://", "").split("/");
    return "acc://" + adi[0];
}