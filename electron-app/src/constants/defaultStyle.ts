export interface StyleConfig {
    font: string;
    font_size: number;
    margin_tb: number;
    margin_lr: number;
    item_spacing: number;
    section_spacing: number;
    heading_content_gap: number;
    entry_spacing: number;
    bullet_indent: number;
    bullet: string;
    section_color: number[];
    extra_protected_terms: string;
    use_icons: boolean;
}

export const defaultStyleConfig: StyleConfig = {
    font: "Calibri",
    font_size: 11,
    margin_tb: 0.5,
    margin_lr: 0.5,
    item_spacing: 0.5,
    section_spacing: 6,
    heading_content_gap: 4,
    entry_spacing: 3,
    bullet_indent: 1.2,
    bullet: "$\\bullet$",
    section_color: [96, 36, 191],
    extra_protected_terms: "",
    use_icons: true,
};
