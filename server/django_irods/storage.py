import os
from tempfile import NamedTemporaryFile

from django.utils.deconstruct import deconstructible
from django.core.files.storage import Storage
from django.core.exceptions import ValidationError

from icommands import GLOBAL_SESSION, GLOBAL_ENVIRONMENT, SessionException


@deconstructible
class IrodsStorage(Storage):
    def __init__(self):
        self.session = GLOBAL_SESSION
        self.environment = GLOBAL_ENVIRONMENT

    def getVideo(self, exp_id, dest_path):
        src_path = os.path.join(exp_id, 'data', 'video')
        self.session.run("iget", None, '-rf', src_path, dest_path)
        return os.path.join(dest_path, 'video')

    def getAllImages(self, exp_id, dest_path):
        src_path = os.path.join(exp_id, 'data', 'image')
        self.session.run("iget", None, '-rf', src_path, dest_path)
        return os.path.join(dest_path, 'image')

    def getFile(self, src_name, dest_name):
        self.session.run("iget", None, '-f', src_name, dest_name)

    def saveFile(self, from_name, to_name, create_directory=False, data_type_str=''):
        """
        Parameters:
        :param
        from_name: the temporary file name in local disk to be uploaded from.
        to_name: the data object path in iRODS to be uploaded to
        create_directory: create directory as needed when set to True. Default is False
        Note if only directory needs to be created without saving a file, from_name should be empty
        and to_name should have "/" as the last character
        """
        if create_directory:
            splitstrs = to_name.rsplit('/', 1)
            self.session.run("imkdir", None, '-p', splitstrs[0])
            if len(splitstrs) <= 1:
                return

        if from_name:
            try:
                if data_type_str:
                    self.session.run("iput", None, '-D', data_type_str, '-f', from_name, to_name)
                else:
                    self.session.run("iput", None, '-f', from_name, to_name)
            except:
                if data_type_str:
                    self.session.run("iput", None, '-D', data_type_str, '-f', from_name, to_name)
                else:
                    # IRODS 4.0.2, sometimes iput fails on the first try.
                    # A second try seems to fix it.
                    self.session.run("iput", None, '-f', from_name, to_name)
        return

    def _open(self, name, mode='rb'):
        tmp = NamedTemporaryFile()
        self.session.run("iget", None, '-f', name, tmp.name)
        return tmp

    def _save(self, name, content):
        self.session.run("imkdir", None, '-p', name.rsplit('/', 1)[0])
        with NamedTemporaryFile(delete=False) as f:
            for chunk in content.chunks():
                f.write(chunk)
            f.flush()
            f.close()
            try:
                self.session.run("iput", None, '-f', f.name, name)
            except:
                # IRODS 4.0.2, sometimes iput fails on the first try. A second try seems to fix it.
                self.session.run("iput", None, '-f', f.name, name)
            os.unlink(f.name)
        return name

    def delete(self, name):
        self.session.run("irm", None, "-rf", name)

    def exists(self, name):
        try:
            stdout = self.session.run("ils", None, name)[0]
            return stdout != ""
        except SessionException:
            return False

    def listdir(self, path):
        stdout = self.session.run("ils", None, path)[0].split("\n")
        listing = ([], [])
        directory = stdout[0][0:-1]
        directory_prefix = "  C- " + directory + "/"
        for i in range(1, len(stdout)):
            if stdout[i][:len(directory_prefix)] == directory_prefix:
                dirname = stdout[i][len(directory_prefix):].strip()
                if dirname:
                    listing[0].append(dirname)
            else:
                filename = stdout[i].strip()
                if filename:
                    listing[1].append(filename)
        return listing

    def size(self, name):
        stdout = self.session.run("ils", None, "-l", name)[0].split()
        return int(stdout[3])

    def get_available_name(self, name):
        """
        Reject duplicate file names rather than renaming them.
        """
        if self.exists(name):
            raise ValidationError(str.format("File {} already exists.", name))
        return name
