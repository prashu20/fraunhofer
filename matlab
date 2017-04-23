input_filename='New_fromWebOfScie.bib';
output_prefix='split_';
output_suffix='.bib';

h_infile=fopen(input_filename,'r');
h_outfile=fopen([output_prefix '_header_' output_suffix],'w');

while(~feof(h_infile))
    line=fgetl(h_infile);
    %name=regexp(line,'@article\{(.*),','tokens','ignorecase');
    name=regexp(line,'Year\={{(.*)','tokens','ignorecase');
    if (~isempty(name))
        fclose(h_outfile);
        name=[output_prefix char(strtrim(name{1})) output_suffix];
        %name=strrep(name,':','_');
        h_outfile=fopen(name,'w');
    end
    fprintf(h_outfile,'%s\n',line);
end

fclose(h_infile);
fclose(h_outfile);
